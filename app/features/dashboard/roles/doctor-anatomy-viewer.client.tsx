/**
 * Visor 3D de anatomía (solo cliente).
 *
 * Three.js accede a `window`, `document` y WebGL en el import — por eso el
 * archivo lleva el sufijo `.client.tsx` y el padre lo carga con React.lazy.
 * Así React Router nunca lo ejecuta durante el SSR y evitamos errores de
 * "window is not defined" al compilar server-side.
 *
 * El <Canvas> gestiona el ciclo de vida de WebGL automáticamente; cuando este
 * componente se desmonta, r3f libera el contexto GL — crítico para evitar
 * fugas de memoria al cambiar de modelo.
 */
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

interface AnatomyViewerProps {
	/** Ruta al archivo .glb dentro de /public (ej: /models/anatomy/Human-skeleton.glb) */
	modelUrl: string;
	/** Activa rotación automática — útil para demos pasivas durante la consulta. */
	autoRotate?: boolean;
	/** Si el tema es oscuro; ajusta el color de fondo del canvas. */
	isDark?: boolean;
	/** Contador: al cambiar, se acerca la cámara al modelo (zoom +). */
	zoomInTick?: number;
	/** Contador: al cambiar, se aleja la cámara del modelo (zoom −). */
	zoomOutTick?: number;
}

/**
 * Instancia mínima de OrbitControls que necesitamos; extraemos solo los
 * campos que usamos para evitar depender del tipado interno de drei.
 */
type OrbitControlsLike = {
	target: THREE.Vector3;
	minDistance: number;
	maxDistance: number;
	update: () => void;
} | null;

/**
 * Auto-encuadre del modelo:
 *   1. Calcula el bounding box tras cargar el .glb.
 *   2. Normaliza la dimensión máxima a ~2 unidades (target size), así cada
 *      modelo rellena el viewport sin importar las unidades con las que se
 *      exportó (mm, cm, m…).
 *   3. Recentra el grafo para que el centro geométrico caiga en el origen,
 *      que es el punto al que mira OrbitControls.
 * Evita tener que configurar `scale` / `yOffset` manualmente por modelo.
 */
/**
 * Calcula el bounding box recorriendo solo meshes visibles y usando el
 * `geometry.boundingBox` de cada uno proyectado por su `matrixWorld`.
 *
 * ¿Por qué no `Box3.setFromObject(obj)`?
 *   - En modelos con skinning/armature (como Beating-heart.glb) los huesos
 *     pueden extenderse mucho más allá de la malla visible, y esa versión
 *     incluye los nodos Bone → el box queda inflado → el factor de escala
 *     queda minúsculo → el modelo se ve diminuto.
 *   - Filtrando por `isMesh` + geometría real, obtenemos el bounding box
 *     del volumen realmente visible, que es lo que queremos encuadrar.
 */
function computeVisibleBoundingBox(obj: THREE.Object3D): THREE.Box3 {
	const box = new THREE.Box3();
	obj.updateWorldMatrix(true, true);
	obj.traverse((child) => {
		const mesh = child as THREE.Mesh;
		if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
		if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
		if (!mesh.geometry.boundingBox) return;
		const meshBox = mesh.geometry.boundingBox.clone();
		meshBox.applyMatrix4(mesh.matrixWorld);
		box.union(meshBox);
	});
	return box;
}

function Model({ modelUrl }: { modelUrl: string }) {
	const { scene } = useGLTF(modelUrl);
	const ref = useRef<THREE.Group>(null);

	// NO clonamos la escena: `scene.clone(true)` rompe SkinnedMesh (sus
	// referencias de skeleton/bones quedan apuntando al esqueleto original)
	// y puede compartir materiales de forma inconsistente — por eso el
	// corazón se veía diminuto y los modelos perdían color. Como el
	// <Canvas> entero se desmonta al cambiar de categoría (AnimatePresence
	// mode="wait"), no hay dos viewers usando la misma escena en simultáneo.

	useLayoutEffect(() => {
		const group = ref.current;
		if (!group) return;
		scene.updateWorldMatrix(true, true);

		// Reset del wrapper antes de medir: el <group> persiste entre
		// renders y si no se resetea, medimos sobre el bounding box ya
		// escalado del render anterior → factor acumulativo.
		group.scale.setScalar(1);
		group.position.set(0, 0, 0);
		group.updateWorldMatrix(true, true);

		const box = computeVisibleBoundingBox(group);
		if (box.isEmpty()) return;

		const size = new THREE.Vector3();
		const center = new THREE.Vector3();
		box.getSize(size);
		box.getCenter(center);

		const maxDim = Math.max(size.x, size.y, size.z);
		// TARGET_SIZE ≈ altura del frustum visible a la distancia de la cámara
		// (ver Canvas más abajo): mantiene al modelo llenando ~85 % del visor.
		const TARGET_SIZE = 2.4;
		const factor = maxDim > 0 ? TARGET_SIZE / maxDim : 1;

		group.scale.setScalar(factor);
		group.position.set(
			-center.x * factor,
			-center.y * factor,
			-center.z * factor,
		);
	}, [scene]);

	return (
		<group ref={ref}>
			<primitive object={scene} />
		</group>
	);
}

/**
 * Controlador de zoom programático: escucha cambios en los contadores
 * `zoomInTick` / `zoomOutTick` (inyectados desde los botones +/−) y mueve
 * la cámara a lo largo del eje target→cámara.
 *
 * ¿Por qué este patrón en vez de exponer `dollyIn/dollyOut` directamente?
 *   - OrbitControls marca esos métodos como internos (prefijo _); la API
 *     pública son `target`, `minDistance`, `maxDistance` y `update()`.
 *   - Mantener el ángulo orbital y mover solo la distancia da un "zoom"
 *     natural sin perder el encuadre actual.
 *
 * Se renderiza dentro de <Canvas> porque `useThree` solo funciona bajo
 * el store de react-three-fiber.
 */
function ZoomController({
	zoomInTick = 0,
	zoomOutTick = 0,
}: {
	zoomInTick: number;
	zoomOutTick: number;
}) {
	const camera = useThree((s) => s.camera);
	const controls = useThree((s) => s.controls) as OrbitControlsLike;
	const prevIn = useRef(zoomInTick);
	const prevOut = useRef(zoomOutTick);

	useEffect(() => {
		const inChanged = zoomInTick !== prevIn.current;
		const outChanged = zoomOutTick !== prevOut.current;
		if (!inChanged && !outChanged) return;

		// Factor por clic: 0.82 acerca, 1.22 aleja. Valores elegidos para
		// que 3 clics cubran ~½ del rango min/max — ni saltos bruscos ni
		// múltiples clics por ajuste fino.
		const factor = inChanged ? 0.82 : 1.22;
		const target = controls?.target ?? new THREE.Vector3(0, 0, 0);
		const minD = controls?.minDistance ?? 0.8;
		const maxD = controls?.maxDistance ?? 6;

		// offset = vector target→cámara. Escalar su longitud conserva el
		// ángulo orbital y solo modifica la distancia, que es justamente
		// la semántica de un botón "zoom".
		const offset = new THREE.Vector3().subVectors(camera.position, target);
		const newDist = THREE.MathUtils.clamp(offset.length() * factor, minD, maxD);
		offset.setLength(newDist);
		camera.position.copy(target).add(offset);
		controls?.update?.();

		prevIn.current = zoomInTick;
		prevOut.current = zoomOutTick;
	}, [zoomInTick, zoomOutTick, camera, controls]);

	return null;
}

export default function AnatomyViewer({
	modelUrl,
	autoRotate = true,
	isDark = false,
	zoomInTick = 0,
	zoomOutTick = 0,
}: AnatomyViewerProps) {
	const canvasBackground = isDark ? '#0b1416' : '#0f1a1d';

	return (
		<Canvas
			// dpr limitado para no matar la batería en móviles — 2x basta para
			// una imagen nítida sin exigir al GPU en pantallas retina.
			dpr={[1, 2]}
			// Cámara cercana (2.6u) + fov estrecho (35°): el modelo ocupa la
			// mayor parte del viewport. Si el médico quiere detalle, OrbitControls
			// permite acercarse hasta 0.8u (ver minDistance).
			camera={{ position: [0, 0, 2.6], fov: 35 }}
			// shadows=false: los .glb educativos no necesitan sombras dinámicas;
			// el environment light ya da volumen suficiente y ahorramos GPU.
			shadows={false}
			style={{
				// Fondo siempre oscuro: los .glb educativos son en su mayoría
				// claros (esqueleto blanco, ADN con tonos pastel) y sobre un
				// fondo claro se pierde contraste — el modelo literalmente
				// desaparece. El token `--color-card` del tema light es muy
				// claro, así que fijamos un teal-900 que funciona en ambos
				// modos y mantiene el entorno "estudio" de la iluminación.
				background: canvasBackground,
				borderRadius: 'inherit',
			}}
		>
			{/* Iluminación: un ambient suave + direccional da contraste sin
			    exigir shadow maps. Intensidades bajas porque Environment aporta
			    la mayor parte del rebote. */}
			<ambientLight intensity={0.45} />
			<directionalLight position={[3, 5, 3]} intensity={0.9} />
			<directionalLight position={[-3, 2, -2]} intensity={0.35} />

			<Suspense fallback={null}>
				{/* Environment "studio": HDR preset que ilumina el modelo con
				    reflejos realistas. No necesita archivos externos. */}
				<Environment preset="studio" />
				<Model modelUrl={modelUrl} />
			</Suspense>

			{/* OrbitControls: rotar (drag), zoom (rueda/pinch), pan (shift+drag).
			    enablePan=false reduce controles accidentales en móvil — el médico
			    solo necesita rotar para mostrar distintos ángulos al paciente.
			    minDistance muy baja (0.8) permite acercarse a detalles finos
			    como válvulas o vértebras; maxDistance evita perder el modelo. */}
			<OrbitControls
				// makeDefault registra la instancia en useThree(s => s.controls)
				// para que ZoomController pueda leer target/minDistance/maxDistance.
				makeDefault
				enablePan={false}
				enableDamping
				dampingFactor={0.08}
				autoRotate={autoRotate}
				autoRotateSpeed={0.6}
				minDistance={0.8}
				maxDistance={6}
				target={[0, 0, 0]}
			/>
			<ZoomController zoomInTick={zoomInTick} zoomOutTick={zoomOutTick} />
		</Canvas>
	);
}

// Precarga de los 3 modelos: al montar el módulo, drei empieza a descargar
// los .glb en segundo plano. Cuando el médico cambia de categoría, el modelo
// ya está en caché y el cambio es instantáneo.
useGLTF.preload('/models/anatomy/Human-skeleton.glb');
useGLTF.preload('/models/anatomy/Beating-heart.glb');
useGLTF.preload('/models/anatomy/DNA.glb');

// Daniel Useche
