/**
 * Componente del mapa con Leaflet — solo se ejecuta en el cliente.
 *
 * Leaflet accede a `window` al importarse, lo que rompe SSR.
 * Por eso este archivo tiene el sufijo `.client.tsx` y se importa
 * dinámicamente con React.lazy() desde la página principal.
 * Así Vite/React Router nunca lo ejecutan en el servidor.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

// ── Types ──────────────────────────────────────────────────────────────────

export interface HospitalResult {
	name: string;
	latitude: number;
	longitude: number;
	distanceMeters: number;
}

interface NearbyHospitalsMapProps {
	userLat: number;
	userLng: number;
	hospitals: HospitalResult[];
	isDarkMode: boolean;
	fetchingHospitals: boolean;
	searchingLabel: string;
	yourLocationLabel: string;
	onHospitalClick: (index: number) => void;
	formatDistance: (meters: number) => string;
}

// ── Leaflet custom icons ───────────────────────────────────────────────────
// Leaflet espera archivos de ícono en rutas relativas que Vite no resuelve.
// Creamos íconos inline con divIcon para no depender de archivos estáticos.

const hospitalIcon = L.divIcon({
	html: `<div style="background:#0d9488;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="16" height="16"><path d="M12 2L2 7v1h20V7L12 2zm-1 9H8v2h3v3h2v-3h3v-2h-3V8h-2v3zM2 22h20v-2H2v2zm2-3h16v-7H4v7z"/></svg>
	</div>`,
	className: '',
	iconSize: [32, 32],
	iconAnchor: [16, 32],
	popupAnchor: [0, -34],
});

const userIcon = L.divIcon({
	html: `<div style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,.4),0 2px 8px rgba(0,0,0,.3)"></div>`,
	className: '',
	iconSize: [20, 20],
	iconAnchor: [10, 10],
});

// ── Map helpers ────────────────────────────────────────────────────────────

/** Centra el mapa cuando cambian las coordenadas del usuario */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
	const map = useMap();
	useEffect(() => {
		map.setView([lat, lng], 14, { animate: true });
	}, [map, lat, lng]);
	return null;
}

/** Ajusta el mapa para que quepan todos los markers */
function FitBoundsToMarkers({
	hospitals,
	userLat,
	userLng,
}: {
	hospitals: HospitalResult[];
	userLat: number;
	userLng: number;
}) {
	const map = useMap();
	useEffect(() => {
		if (hospitals.length === 0) return;
		const points: L.LatLngExpression[] = [
			[userLat, userLng],
			...hospitals.map((h) => [h.latitude, h.longitude] as L.LatLngExpression),
		];
		// fitBounds con padding para que los markers no queden pegados al borde
		const bounds = L.latLngBounds(points);
		map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
	}, [map, hospitals, userLat, userLng]);
	return null;
}

// ── Map component ──────────────────────────────────────────────────────────

export default function NearbyHospitalsMap({
	userLat,
	userLng,
	hospitals,
	isDarkMode,
	fetchingHospitals,
	searchingLabel,
	yourLocationLabel,
	onHospitalClick,
	formatDistance,
}: NearbyHospitalsMapProps) {
	// Tile URL que respeta dark mode — CartoDB ofrece variante oscura
	const tileUrl = isDarkMode
		? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
		: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

	return (
		<div className="relative h-full w-full">
			{/* MapContainer llena su padre — el padre controla el tamaño.
			    zoomControl y attributionControl desactivados para UI limpia. */}
			<MapContainer
				center={[userLat, userLng]}
				zoom={14}
				className="h-full w-full"
				zoomControl={false}
				attributionControl={false}
			>
				<TileLayer
					url={tileUrl}
					attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/">OSM</a>'
				/>
				<RecenterMap lat={userLat} lng={userLng} />
				{hospitals.length > 0 && (
					<FitBoundsToMarkers
						hospitals={hospitals}
						userLat={userLat}
						userLng={userLng}
					/>
				)}

				{/* Marker del usuario */}
				<Marker position={[userLat, userLng]} icon={userIcon}>
					<Popup>
						<span className="text-xs font-semibold">{yourLocationLabel}</span>
					</Popup>
				</Marker>

				{/* Markers de hospitales */}
				{hospitals.map((h, i) => (
					<Marker
						key={`${h.latitude}-${h.longitude}-${h.name}`}
						position={[h.latitude, h.longitude]}
						icon={hospitalIcon}
						eventHandlers={{
							click: () => onHospitalClick(i),
						}}
					>
						<Popup>
							<div className="max-w-[200px]">
								<p className="text-xs font-semibold">{h.name}</p>
								<p className="mt-1 text-[10px] text-gray-500">
									{formatDistance(h.distanceMeters)}
								</p>
							</div>
						</Popup>
					</Marker>
				))}
			</MapContainer>

			{/* Overlay: loading hospitales */}
			<AnimatePresence>
				{fetchingHospitals && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/60 backdrop-blur-sm"
					>
						<div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-md">
							<motion.div
								className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent"
								animate={{ rotate: 360 }}
								transition={{
									duration: 0.8,
									repeat: Infinity,
									ease: 'linear',
								}}
							/>
							<span className="text-xs font-medium">{searchingLabel}</span>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// Daniel Useche
