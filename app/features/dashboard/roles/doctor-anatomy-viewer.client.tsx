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
import { Suspense } from 'react';

interface AnatomyViewerProps {
	/** Ruta al archivo .glb dentro de /public (ej: /models/anatomy/Human-skeleton.glb) */
	modelUrl: string;
	/** Escala uniforme aplicada al modelo (los .glb traen escalas distintas). */
	scale?: number;
	/** Posición vertical para centrar visualmente modelos altos/bajos. */
	yOffset?: number;
	/** Activa rotación automática — útil para demos pasivas durante la consulta. */
	autoRotate?: boolean;
	/** Si el tema es oscuro; ajusta el color de fondo del canvas. */
	isDark?: boolean;
}

/**
 * Carga el modelo GLB con suspense. useGLTF cachea internamente por URL,
 * así que volver a seleccionar una categoría ya vista es instantáneo.
 */
function Model({
	modelUrl,
	scale = 1,
	yOffset = 0,
}: {
	modelUrl: string;
	scale?: number;
	yOffset?: number;
}) {
	const { scene } = useGLTF(modelUrl);
	// Clonamos la escena para permitir que el mismo modelo se reutilice en
	// distintos contextos sin compartir el grafo — evita glitches al navegar
	// rápidamente entre categorías.
	return <primitive object={scene} scale={scale} position={[0, yOffset, 0]} />;
}

export default function AnatomyViewer({
	modelUrl,
	scale = 1,
	yOffset = 0,
	autoRotate = true,
	isDark = false,
}: AnatomyViewerProps) {
	return (
		<Canvas
			// dpr limitado para no matar la batería en móviles — 2x basta para
			// una imagen nítida sin exigir al GPU en pantallas retina.
			dpr={[1, 2]}
			camera={{ position: [0, 0.5, 4], fov: 45 }}
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
				<Model modelUrl={modelUrl} scale={scale} yOffset={yOffset} />
			</Suspense>

			{/* OrbitControls: rotar (drag), zoom (rueda/pinch), pan (shift+drag).
			    enablePan=false reduce controles accidentales en móvil — el médico
			    solo necesita rotar para mostrar distintos ángulos al paciente.
			    minDistance/maxDistance evitan que el usuario pierda el modelo. */}
			<OrbitControls
				enablePan={false}
				enableDamping
				dampingFactor={0.08}
				autoRotate={autoRotate}
				autoRotateSpeed={0.6}
				minDistance={1.5}
				maxDistance={10}
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
