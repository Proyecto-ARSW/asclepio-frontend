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
import { Canvas } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface AnatomyViewerProps {
	/** Ruta al archivo .glb dentro de /public (ej: /models/anatomy/Human-skeleton.glb) */
	modelUrl: string;
	/** Activa rotación automática — útil para demos pasivas durante la consulta. */
	autoRotate?: boolean;
	/** Si el tema es oscuro; ajusta el color de fondo del canvas. */
	isDark?: boolean;
}

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
function Model({ modelUrl }: { modelUrl: string }) {
	const { scene } = useGLTF(modelUrl);
	// Clonamos para que el cache interno de useGLTF no comparta el grafo
	// entre instancias — cambiar de categoría podría romper el centrado si
	// mutamos la escena original.
	const cloned = useMemo(() => scene.clone(true), [scene]);
	const ref = useRef<THREE.Group>(null);

	useLayoutEffect(() => {
		const group = ref.current;
		if (!group) return;

		const box = new THREE.Box3().setFromObject(group);
		const size = new THREE.Vector3();
		const center = new THREE.Vector3();
		box.getSize(size);
		box.getCenter(center);

		const maxDim = Math.max(size.x, size.y, size.z);
		// TARGET_SIZE ≈ altura del frustum visible a la distancia de la cámara
		// (ver Canvas más abajo): mantiene al modelo llenando ~80 % del visor.
		const TARGET_SIZE = 2.4;
		const factor = maxDim > 0 ? TARGET_SIZE / maxDim : 1;

		group.scale.setScalar(factor);
		group.position.set(
			-center.x * factor,
			-center.y * factor,
			-center.z * factor,
		);
	}, [cloned]);

	return (
		<group ref={ref}>
			<primitive object={cloned} />
		</group>
	);
}

export default function AnatomyViewer({
	modelUrl,
	autoRotate = true,
	isDark = false,
}: AnatomyViewerProps) {
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
				background: isDark ? '#0b1416' : '#f0f9ff',
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
				enablePan={false}
				enableDamping
				dampingFactor={0.08}
				autoRotate={autoRotate}
				autoRotateSpeed={0.6}
				minDistance={0.8}
				maxDistance={6}
				target={[0, 0, 0]}
			/>
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
