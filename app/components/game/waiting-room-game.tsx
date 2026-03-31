import {
	PlayIcon,
	StopIcon,
	TrophyIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline';
import { useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field/field.component';
import { Input } from '@/components/ui/input/input.component';
import { currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { useAuthStore } from '@/store/auth.store';

// ─── Constants matching the Go server ────────────────────────────────────────
const BASE_SPEED = 200;
const SPEED_DECAY = 120;
const LERP_K = 10;
const SEND_INTERVAL_MS = 30;
const LEADERBOARD_SIZE = 10;
const FOOD_RADIUS = 8;
const FOOD_PICKUP_PADDING = 2;
const LOCAL_FOOD_CHECK_MS = 65;
const OPTIMISTIC_FOOD_TTL_MS = 900;
const INITIAL_VIEW = 620;

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlayerSnapshot {
	id: string;
	name: string;
	x: number;
	y: number;
	radius: number;
	color: string;
	score: number;
}

interface FoodSnapshot {
	id: number;
	x: number;
	y: number;
	color: string;
}

interface LeaderboardEntry {
	rank: number;
	name: string;
	score: number;
	color: string;
}

interface GameSetupValues {
	nickname: string;
	color: string;
}

interface InitMsg {
	type: 'init';
	playerId: string;
	worldWidth: number;
	worldHeight: number;
	color: string;
	name: string;
	food: FoodSnapshot[];
}

interface StateMsg {
	type: 'state';
	tick: number;
	players: PlayerSnapshot[];
	foodAdded?: FoodSnapshot[];
	foodRemoved?: number[];
	leaderboard?: LeaderboardEntry[];
}

interface DiedMsg {
	type: 'died';
	killedBy: string;
	finalScore: number;
}

type ServerMsg =
	| InitMsg
	| StateMsg
	| DiedMsg
	| { type: 'error'; message: string };

// ─── CSS variable → hex ───────────────────────────────────────────────────────
// Sets background-color to var(--x) on a hidden element and reads the
// computed RGB back. Works with oklch, hsl, rgb, hex — any format.
function resolveColor(varName: string, fallback: string): string {
	if (typeof document === 'undefined') return fallback;
	try {
		const el = document.createElement('div');
		el.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;background-color:var(${varName})`;
		document.body.appendChild(el);
		const bg = getComputedStyle(el).backgroundColor;
		document.body.removeChild(el);
		if (!bg || bg === 'transparent' || bg.startsWith('rgba(0, 0, 0, 0)'))
			return fallback;
		const m = bg.match(/\d+/g);
		if (!m || m.length < 3) return fallback;
		return `#${m
			.slice(0, 3)
			.map((n) => Number(n).toString(16).padStart(2, '0'))
			.join('')}`;
	} catch {
		return fallback;
	}
}

function getThemeColors() {
	// --border is near-white in light mode; use --muted-foreground (medium grey)
	// so the grid is visible in both light and dark themes.
	return {
		primary: resolveColor('--primary', '#6366f1'),
		background: resolveColor('--card', '#ffffff'),
		border: resolveColor('--muted-foreground', '#94a3b8'),
		foreground: resolveColor('--foreground', '#0f172a'),
		muted: resolveColor('--muted', '#f1f5f9'),
	};
}

// ─── WS URL derivation ────────────────────────────────────────────────────────
function buildWsUrl(token: string, setup?: GameSetupValues): string {
	const base = import.meta.env.VITE_GAME_SERVER_URL as string | undefined;
	const origin = base ?? 'http://localhost:3002';
	// Convert http(s) → ws(s)
	const wsOrigin = origin
		.replace(/^https:\/\//, 'wss://')
		.replace(/^http:\/\//, 'ws://');
	const params = new URLSearchParams({ token });
	if (setup?.nickname) params.set('name', setup.nickname);
	if (setup?.color) params.set('color', setup.color);
	return `${wsOrigin}/ws/game?${params.toString()}`;
}

// ─── Rendering helpers ────────────────────────────────────────────────────────
function lighten(hex: string, amt: number): string {
	const n = parseInt(hex.replace('#', ''), 16);
	const r = Math.min(255, (n >> 16) + amt);
	const g = Math.min(255, ((n >> 8) & 0xff) + amt);
	const b = Math.min(255, (n & 0xff) + amt);
	return `rgb(${r},${g},${b})`;
}

function lerpVal(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

function blobSpeed(r: number) {
	return BASE_SPEED / (1 + r / SPEED_DECAY);
}

// ─── Component ────────────────────────────────────────────────────────────────
type GamePhase = 'idle' | 'connecting' | 'playing' | 'dead' | 'error';

export function WaitingRoomGame() {
	const { accessToken, user } = useAuthStore();
	const locale = currentLocale();
	const initialNickname =
		user && `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim().length > 0
			? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim()
			: m.authRolePatient({}, { locale });
	const initialColor = resolveColor('--primary', '#3b82f6');

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Game phase
	const [phase, setPhase] = useState<GamePhase>('idle');
	const [errorMsg, setErrorMsg] = useState('');
	const [deathInfo, setDeathInfo] = useState<{
		killedBy: string;
		score: number;
	} | null>(null);
	const [liveScore, setLiveScore] = useState(0);
	const [playerCount, setPlayerCount] = useState(0);
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

	// All mutable game state lives in refs — never in React state — to avoid
	// re-renders inside the rAF loop.
	const wsRef = useRef<WebSocket | null>(null);
	const loopRef = useRef<number>(0);
	const lastFrameMsRef = useRef(0);
	const lastSendMsRef = useRef(0);

	// World
	const worldWRef = useRef(3000);
	const worldHRef = useRef(3000);
	const myIdRef = useRef('');
	const myNameRef = useRef('');

	// Input
	const dirRef = useRef({ x: 0, y: 0 });

	// Prediction (own blob)
	const predRef = useRef({
		x: 0,
		y: 0,
		radius: 20,
		score: 0,
		color: '#3b82f6',
		name: '',
	});
	const predReadyRef = useRef(false);

	// Interp targets for other players
	const interpRef = useRef<
		Record<
			string,
			{
				x: number;
				y: number;
				radius: number;
				tx: number;
				ty: number;
				tr: number;
				name: string;
				color: string;
				score: number;
			}
		>
	>({});

	// Food map
	const foodMapRef = useRef<Map<number, FoodSnapshot>>(new Map());
	const optimisticEatenFoodRef = useRef<Map<number, number>>(new Map());
	const lastLocalFoodCheckMsRef = useRef(0);
	const setupRef = useRef<GameSetupValues>({
		nickname: initialNickname,
		color: initialColor,
	});

	// Pending network messages — only latest state frame kept
	const pendingInitRef = useRef<InitMsg | null>(null);
	const pendingStateRef = useRef<StateMsg | null>(null);
	const pendingDiedRef = useRef<DiedMsg | null>(null);

	// Theme colours (read once when game starts)
	const themeRef = useRef(getThemeColors());

	// ── Canvas resize ─────────────────────────────────────────────────────────
	const resizeCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;
		canvas.width = container.clientWidth;
		canvas.height = container.clientHeight;
	}, []);

	// ── Input ─────────────────────────────────────────────────────────────────
	const handleMouseMove = useCallback((e: MouseEvent) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const dx = e.clientX - rect.left - canvas.width / 2;
		const dy = e.clientY - rect.top - canvas.height / 2;
		const mag = Math.hypot(dx, dy);
		dirRef.current = mag > 10 ? { x: dx / mag, y: dy / mag } : { x: 0, y: 0 };
	}, []);

	const handleTouchMove = useCallback((e: TouchEvent) => {
		e.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas || !e.touches[0]) return;
		const rect = canvas.getBoundingClientRect();
		const t = e.touches[0];
		const dx = t.clientX - rect.left - canvas.width / 2;
		const dy = t.clientY - rect.top - canvas.height / 2;
		const mag = Math.hypot(dx, dy);
		dirRef.current = mag > 10 ? { x: dx / mag, y: dy / mag } : { x: 0, y: 0 };
	}, []);

	// ── Drain network messages (called once per rAF) ──────────────────────────
	const drainMessages = useCallback(() => {
		const now = performance.now();
		for (const [foodId, ts] of optimisticEatenFoodRef.current) {
			if (now - ts > OPTIMISTIC_FOOD_TTL_MS) {
				optimisticEatenFoodRef.current.delete(foodId);
			}
		}

		// Init
		if (pendingInitRef.current) {
			const msg = pendingInitRef.current;
			pendingInitRef.current = null;
			const setupNickname = setupRef.current.nickname.trim();
			const setupColor = setupRef.current.color;
			const playerName = setupNickname || msg.name;

			myIdRef.current = msg.playerId;
			myNameRef.current = playerName;
			worldWRef.current = msg.worldWidth;
			worldHRef.current = msg.worldHeight;

			foodMapRef.current.clear();
			optimisticEatenFoodRef.current.clear();
			for (const f of msg.food ?? []) foodMapRef.current.set(f.id, f);

			interpRef.current = {};
			predRef.current = {
				x: msg.worldWidth / 2,
				y: msg.worldHeight / 2,
				radius: 20,
				score: 0,
				color: setupColor || msg.color,
				name: playerName,
			};
			predReadyRef.current = true;

			setPhase('playing');
		}

		// State (only the latest frame — stale frames are already discarded by onmessage)
		if (pendingStateRef.current) {
			const msg = pendingStateRef.current;
			pendingStateRef.current = null;

			// Food deltas
			for (const f of msg.foodAdded ?? []) {
				if (!optimisticEatenFoodRef.current.has(f.id)) {
					foodMapRef.current.set(f.id, f);
				}
			}
			for (const id of msg.foodRemoved ?? []) {
				foodMapRef.current.delete(id);
				optimisticEatenFoodRef.current.delete(id);
			}

			// Leaderboard (throttled server-side)
			if (msg.leaderboard) {
				setLeaderboard(msg.leaderboard.slice(0, LEADERBOARD_SIZE));
			}

			// Players
			const seen = new Set<string>();
			let count = 0;
			for (const p of msg.players ?? []) {
				seen.add(p.id);
				count++;
				if (p.id === myIdRef.current) {
					// Soft server correction on own blob
					const pred = predRef.current;
					pred.x = lerpVal(pred.x, p.x, 0.25);
					pred.y = lerpVal(pred.y, p.y, 0.25);
					pred.radius = lerpVal(pred.radius, p.radius, 0.35);
					pred.score = p.score;
					setLiveScore(p.score);
				} else {
					const existing = interpRef.current[p.id];
					if (existing) {
						existing.tx = p.x;
						existing.ty = p.y;
						existing.tr = p.radius;
						existing.name = p.name;
						existing.color = p.color;
						existing.score = p.score;
					} else {
						interpRef.current[p.id] = {
							x: p.x,
							y: p.y,
							radius: p.radius,
							tx: p.x,
							ty: p.y,
							tr: p.radius,
							name: p.name,
							color: p.color,
							score: p.score,
						};
					}
				}
			}
			for (const id of Object.keys(interpRef.current)) {
				if (!seen.has(id)) delete interpRef.current[id];
			}
			setPlayerCount(count);
		}

		// Death
		if (pendingDiedRef.current) {
			const msg = pendingDiedRef.current;
			pendingDiedRef.current = null;
			predReadyRef.current = false;
			setDeathInfo({ killedBy: msg.killedBy, score: msg.finalScore });
			setPhase('dead');
		}
	}, []);

	// ── Simulation step ───────────────────────────────────────────────────────
	const stepSimulation = useCallback((dt: number, now: number) => {
		// Predict own blob
		if (predReadyRef.current) {
			const pred = predRef.current;
			const spd = blobSpeed(pred.radius);
			const { x: dx, y: dy } = dirRef.current;
			const mag = Math.hypot(dx, dy);
			if (mag > 0.01) {
				pred.x += (dx / mag) * spd * dt;
				pred.y += (dy / mag) * spd * dt;
				pred.x = Math.max(
					pred.radius,
					Math.min(worldWRef.current - pred.radius, pred.x),
				);
				pred.y = Math.max(
					pred.radius,
					Math.min(worldHRef.current - pred.radius, pred.y),
				);
			}

			if (now - lastLocalFoodCheckMsRef.current >= LOCAL_FOOD_CHECK_MS) {
				lastLocalFoodCheckMsRef.current = now;
				const eatDistance = pred.radius + FOOD_RADIUS + FOOD_PICKUP_PADDING;
				for (const [foodId, food] of foodMapRef.current) {
					const dist = Math.hypot(food.x - pred.x, food.y - pred.y);
					if (dist <= eatDistance) {
						foodMapRef.current.delete(foodId);
						optimisticEatenFoodRef.current.set(foodId, now);
						pred.score += 1;
						pred.radius += 0.06;
						setLiveScore(pred.score);
					}
				}
			}
		}

		// Interpolate other players
		const f = 1 - Math.exp(-LERP_K * dt);
		for (const s of Object.values(interpRef.current)) {
			s.x = lerpVal(s.x, s.tx, f);
			s.y = lerpVal(s.y, s.ty, f);
			s.radius = lerpVal(s.radius, s.tr, f);
		}
	}, []);

	// ── Send move ─────────────────────────────────────────────────────────────
	const trySendMove = useCallback((now: number) => {
		const ws = wsRef.current;
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		if (now - lastSendMsRef.current < SEND_INTERVAL_MS) return;
		lastSendMsRef.current = now;
		const { x: dx, y: dy } = dirRef.current;
		ws.send(JSON.stringify({ type: 'move', dx, dy }));
	}, []);

	// ── Render ────────────────────────────────────────────────────────────────
	const render = useCallback(
		(now: number) => {
			const canvas = canvasRef.current;
			const ctx = canvas?.getContext('2d');
			if (!canvas || !ctx) return;

			const dt = Math.min((now - lastFrameMsRef.current) / 1000, 0.1);
			lastFrameMsRef.current = now;

			drainMessages();
			stepSimulation(dt, now);
			trySendMove(now);

			const theme = themeRef.current;
			const pred = predRef.current;
			const worldW = worldWRef.current;
			const worldH = worldHRef.current;

			// ── Camera ──────────────────────────────────────────────────────
			const shortestSide = Math.min(canvas.width, canvas.height);
			let camX: number, camY: number, scale: number;
			if (predReadyRef.current) {
				const dynamicView = INITIAL_VIEW + Math.max(0, pred.radius - 20) * 6.5;
				scale = Math.max(0.2, Math.min(2, shortestSide / dynamicView));
				camX = pred.x;
				camY = pred.y;
			} else {
				camX = worldW / 2;
				camY = worldH / 2;
				scale = Math.max(
					0.2,
					Math.min(2, shortestSide / (INITIAL_VIEW * 1.15)),
				);
			}

			// Viewport bounds in world units (generous margin so nothing pops)
			const margin = 100 / scale;
			const hw = canvas.width / 2 / scale + margin;
			const hh = canvas.height / 2 / scale + margin;
			const vx0 = camX - hw,
				vx1 = camX + hw;
			const vy0 = camY - hh,
				vy1 = camY + hh;

			// ── Background ──────────────────────────────────────────────────
			ctx.fillStyle = theme.background;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.save();
			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.scale(scale, scale);
			ctx.translate(-camX, -camY);

			// ── Grid (constant visual weight, independent of zoom) ───────────
			{
				const G = 100;
				const gx0 = Math.floor(vx0 / G) * G;
				const gx1 = Math.ceil(vx1 / G) * G;
				const gy0 = Math.floor(vy0 / G) * G;
				const gy1 = Math.ceil(vy1 / G) * G;
				ctx.save();
				ctx.strokeStyle = theme.border;
				ctx.globalAlpha = 0.28;
				ctx.lineWidth = 1 / scale; // always 1 screen pixel
				ctx.beginPath();
				for (let x = gx0; x <= gx1; x += G) {
					ctx.moveTo(x, gy0);
					ctx.lineTo(x, gy1);
				}
				for (let y = gy0; y <= gy1; y += G) {
					ctx.moveTo(gx0, y);
					ctx.lineTo(gx1, y);
				}
				ctx.stroke();
				ctx.restore();
			}

			// ── World border ────────────────────────────────────────────────
			ctx.save();
			ctx.strokeStyle = theme.primary;
			ctx.globalAlpha = 0.5;
			ctx.lineWidth = 6 / scale;
			ctx.strokeRect(0, 0, worldW, worldH);
			ctx.restore();

			// ── Food ────────────────────────────────────────────────────────
			for (const f of foodMapRef.current.values()) {
				if (f.x < vx0 || f.x > vx1 || f.y < vy0 || f.y > vy1) continue;
				ctx.beginPath();
				ctx.arc(f.x, f.y, FOOD_RADIUS, 0, Math.PI * 2);
				ctx.fillStyle = f.color;
				ctx.shadowColor = f.color;
				ctx.shadowBlur = 14 / scale;
				ctx.fill();
			}
			ctx.shadowBlur = 0;

			// ── Blobs (depth-sorted circles — text rendered in screen space) ─
			const blobs: Array<{
				id: string;
				x: number;
				y: number;
				radius: number;
				name: string;
				color: string;
				score: number;
			}> = [];
			if (predReadyRef.current) blobs.push({ id: myIdRef.current, ...pred });
			for (const s of Object.values(interpRef.current))
				blobs.push({ id: s.name, ...s });
			blobs.sort((a, b) => a.radius - b.radius);

			for (const p of blobs) {
				if (
					p.x + p.radius < vx0 ||
					p.x - p.radius > vx1 ||
					p.y + p.radius < vy0 ||
					p.y - p.radius > vy1
				)
					continue;

				const isMe = p.id === myIdRef.current;
				const r = Math.max(p.radius, 1);

				const gr = ctx.createRadialGradient(
					p.x - r * 0.28,
					p.y - r * 0.28,
					r * 0.05,
					p.x,
					p.y,
					r,
				);
				gr.addColorStop(0, lighten(p.color, 55));
				gr.addColorStop(1, p.color);

				if (isMe) {
					ctx.shadowColor = p.color;
					ctx.shadowBlur = 22 / scale;
				}
				ctx.beginPath();
				ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
				ctx.fillStyle = gr;
				ctx.fill();
				ctx.lineWidth = (isMe ? 3 : 1.5) / scale;
				ctx.strokeStyle = isMe ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.2)';
				ctx.stroke();
				ctx.shadowBlur = 0;
			}

			ctx.restore();

			// ── Screen-space text labels (size in real pixels, always readable) ─
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			for (const p of blobs) {
				const sr = p.radius * scale; // blob radius in screen pixels
				if (sr < 12) continue;
				const sx = (p.x - camX) * scale + canvas.width / 2;
				const sy = (p.y - camY) * scale + canvas.height / 2;
				// skip if off-screen
				if (
					sx + sr < 0 ||
					sx - sr > canvas.width ||
					sy + sr < 0 ||
					sy - sr > canvas.height
				)
					continue;
				const isMe = p.id === myIdRef.current;
				const fs = Math.max(11, Math.min(sr * 0.38, 20));
				ctx.font = `${isMe ? '700 ' : '500 '}${fs}px "Plus Jakarta Sans",system-ui,sans-serif`;
				ctx.fillStyle = 'rgba(0,0,0,0.45)';
				ctx.fillText(p.name, sx + 1, sy + 1);
				ctx.fillStyle = '#fff';
				ctx.fillText(p.name, sx, sy);
				if (sr > 26) {
					ctx.font = `${Math.max(9, fs * 0.65)}px "Plus Jakarta Sans",system-ui,sans-serif`;
					ctx.fillStyle = 'rgba(255,255,255,0.75)';
					ctx.fillText(String(p.score), sx, sy + fs * 0.72);
				}
			}
		},
		[drainMessages, stepSimulation, trySendMove],
	);

	// ── Game loop ─────────────────────────────────────────────────────────────
	const startLoop = useCallback(() => {
		lastFrameMsRef.current = performance.now();
		const tick = (now: number) => {
			render(now);
			loopRef.current = requestAnimationFrame(tick);
		};
		loopRef.current = requestAnimationFrame(tick);
	}, [render]);

	const stopLoop = useCallback(() => {
		cancelAnimationFrame(loopRef.current);
	}, []);

	// ── Connect ───────────────────────────────────────────────────────────────
	const connect = useCallback(() => {
		if (!accessToken) {
			setErrorMsg(m.gameWaitingRoomNoActiveSession({}, { locale }));
			setPhase('error');
			return;
		}
		setPhase('connecting');
		setDeathInfo(null);
		setLiveScore(0);
		setLeaderboard([]);
		predReadyRef.current = false;
		pendingInitRef.current = null;
		pendingStateRef.current = null;
		pendingDiedRef.current = null;
		interpRef.current = {};
		foodMapRef.current.clear();
		optimisticEatenFoodRef.current.clear();
		lastLocalFoodCheckMsRef.current = 0;
		themeRef.current = getThemeColors();

		const url = buildWsUrl(accessToken, setupRef.current);
		const ws = new WebSocket(url);
		wsRef.current = ws;

		ws.onopen = () => {
			// Phase will flip to 'playing' once 'init' message arrives
		};

		ws.onmessage = (e: MessageEvent) => {
			let msg: ServerMsg;
			try {
				msg = JSON.parse(e.data as string) as ServerMsg;
			} catch {
				setErrorMsg(m.gameWaitingRoomServerErrorFallback({}, { locale }));
				setPhase('error');
				return;
			}
			switch (msg.type) {
				case 'init':
					pendingInitRef.current = msg;
					break;
				case 'state':
					// Keep only the latest frame — old frames under lag are discarded.
					pendingStateRef.current = msg;
					break;
				case 'died':
					pendingDiedRef.current = msg;
					break;
				case 'error':
					setErrorMsg(
						msg.message ?? m.gameWaitingRoomServerErrorFallback({}, { locale }),
					);
					setPhase('error');
					break;
			}
		};

		ws.onerror = () => {
			setErrorMsg(m.gameWaitingRoomConnectionFailed({}, { locale }));
			setPhase('error');
		};

		ws.onclose = () => {
			// Only flip to idle if we haven't already processed a death or error
			setPhase((prev) =>
				prev === 'playing' || prev === 'connecting' ? 'idle' : prev,
			);
		};
	}, [accessToken, locale]);

	// ── Disconnect ────────────────────────────────────────────────────────────
	const disconnect = useCallback(() => {
		const ws = wsRef.current;
		if (ws) {
			ws.onclose = null;
			ws.close();
			wsRef.current = null;
		}
		stopLoop();
		predReadyRef.current = false;
		optimisticEatenFoodRef.current.clear();
		setPhase('idle');
	}, [stopLoop]);

	const setupForm = useForm({
		defaultValues: {
			nickname: initialNickname,
			color: initialColor,
		},
		onSubmit: async ({ value }) => {
			const nickname = value.nickname.trim() || initialNickname;
			setupRef.current = {
				nickname,
				color: value.color || initialColor,
			};
			connect();
		},
	});

	// ── Lifecycle: start/stop loop with phase ─────────────────────────────────
	useEffect(() => {
		if (phase === 'playing' || phase === 'connecting') {
			resizeCanvas();
			startLoop();
		} else {
			stopLoop();
		}
		return () => stopLoop();
	}, [phase, startLoop, stopLoop, resizeCanvas]);

	// ── Lifecycle: canvas input events ────────────────────────────────────────
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || phase !== 'playing') return;
		canvas.addEventListener('mousemove', handleMouseMove);
		canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
		return () => {
			canvas.removeEventListener('mousemove', handleMouseMove);
			canvas.removeEventListener('touchmove', handleTouchMove);
		};
	}, [phase, handleMouseMove, handleTouchMove]);

	// ── Lifecycle: window resize ──────────────────────────────────────────────
	useEffect(() => {
		if (phase !== 'playing' && phase !== 'connecting') return;
		window.addEventListener('resize', resizeCanvas);
		return () => window.removeEventListener('resize', resizeCanvas);
	}, [phase, resizeCanvas]);

	// ── Cleanup on unmount ────────────────────────────────────────────────────
	useEffect(() => {
		return () => {
			stopLoop();
			const ws = wsRef.current;
			if (ws) {
				ws.onclose = null;
				ws.close();
			}
		};
	}, [stopLoop]);

	// ─── Render ───────────────────────────────────────────────────────────────
	const isPlaying = phase === 'playing';
	const ownDisplayName = setupRef.current.nickname || initialNickname;

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 className="text-xl font-bold text-foreground">
						{m.gameWaitingRoomTitle({}, { locale })}
					</h2>
					<p className="text-sm text-muted-foreground">
						{m.gameWaitingRoomSubtitle({}, { locale })}
					</p>
				</div>

				<div className="flex items-center gap-2">
					{isPlaying && (
						<>
							<Badge variant="secondary" className="gap-1.5 tabular-nums">
								<span className="inline-block h-2 w-2 rounded-full bg-primary" />
								{playerCount}{' '}
								{playerCount === 1
									? m.gameWaitingRoomPlayerSingular({}, { locale })
									: m.gameWaitingRoomPlayerPlural({}, { locale })}
							</Badge>
							<Badge
								variant="outline"
								className="tabular-nums font-semibold text-primary"
							>
								{liveScore} {m.gameWaitingRoomPointsShort({}, { locale })}
							</Badge>
						</>
					)}

					{isPlaying && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={disconnect}
							className="gap-1.5"
						>
							<StopIcon className="h-4 w-4" />
							{m.gameWaitingRoomLeave({}, { locale })}
						</Button>
					)}
				</div>
			</div>

			<div
				ref={containerRef}
				className="relative min-h-95 w-full overflow-hidden rounded-xl border border-border bg-muted/30 sm:min-h-115 xl:min-h-140"
			>
				<canvas
					ref={canvasRef}
					className={`block h-full w-full touch-none ${isPlaying ? 'cursor-none' : 'cursor-default'}`}
				/>

				<div className="pointer-events-none absolute right-2 top-2 z-10 w-52 rounded-xl border border-border/70 bg-background/80 p-2.5 shadow-sm backdrop-blur-sm">
					<p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
						<TrophyIcon className="h-3.5 w-3.5 text-primary" aria-hidden />
						{m.gameWaitingRoomBiggestBlobs({}, { locale })}
					</p>
					{leaderboard.length === 0 ? (
						<p className="mt-2 text-[11px] text-muted-foreground">
							{m.gameWaitingRoomLoading({}, { locale })}
						</p>
					) : (
						<ol className="mt-2 space-y-1">
							{leaderboard.slice(0, LEADERBOARD_SIZE).map((entry) => (
								<li
									key={`${entry.rank}-${entry.name}`}
									className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px] ${
										entry.name === ownDisplayName
											? 'bg-primary/15 font-semibold text-primary'
											: 'text-foreground'
									}`}
								>
									<span className="w-4 shrink-0 text-right tabular-nums text-muted-foreground">
										{entry.rank}
									</span>
									<span
										className="h-2.5 w-2.5 shrink-0 rounded-full"
										style={{ backgroundColor: entry.color }}
									/>
									<span className="flex-1 truncate">{entry.name}</span>
									<span className="tabular-nums text-muted-foreground">
										{entry.score}
									</span>
								</li>
							))}
						</ol>
					)}
				</div>

				{phase === 'idle' && (
					<div className="absolute inset-0 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm sm:p-6">
						<div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/95 p-4 shadow-lg sm:p-5">
							<div className="text-center">
								<p className="text-base font-semibold text-foreground sm:text-lg">
									{m.gameWaitingRoomIdleTitle({}, { locale })}
								</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{m.gameWaitingRoomIdleDescription({}, { locale })}
								</p>
							</div>
							<form
								onSubmit={(event) => {
									event.preventDefault();
									void setupForm.handleSubmit();
								}}
								className="mt-4 space-y-3"
							>
								<setupForm.Field
									name="nickname"
									validators={{
										onChange: ({ value }) =>
											value.trim().length > 0
												? undefined
												: m.authRegisterErrorRequiredName({}, { locale }),
									}}
								>
									{(field) => (
										<Field
											data-invalid={Boolean(field.state.meta.errors.length)}
										>
											<FieldLabel htmlFor={field.name}>
												{m.authRegisterLabelNombre({}, { locale })}
											</FieldLabel>
											<Input
												id={field.name}
												type="text"
												maxLength={24}
												autoComplete="nickname"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												placeholder={m.authRegisterPlaceholderNombre(
													{},
													{ locale },
												)}
											/>
											<FieldError
												errors={field.state.meta.errors.map((message) => ({
													message,
												}))}
											/>
										</Field>
									)}
								</setupForm.Field>

								<setupForm.Field name="color">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												{m.dashboardSettingsThemeTitle({}, { locale })}
											</FieldLabel>
											<Input
												id={field.name}
												type="color"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												className="h-10 cursor-pointer p-1"
											/>
											<FieldDescription>
												{m.dashboardSettingsThemeDescription({}, { locale })}
											</FieldDescription>
										</Field>
									)}
								</setupForm.Field>

								<div className="flex justify-end">
									<Button type="submit" className="gap-2">
										<PlayIcon className="h-4 w-4" />
										{m.gameWaitingRoomStart({}, { locale })}
									</Button>
								</div>
							</form>
						</div>
					</div>
				)}

				{phase === 'connecting' && (
					<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
						<div className="flex flex-col items-center gap-3">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							<p className="text-sm text-muted-foreground">
								{m.gameWaitingRoomConnecting({}, { locale })}
							</p>
						</div>
					</div>
				)}

				{phase === 'dead' && deathInfo && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-sm">
						<p className="text-4xl select-none" aria-hidden>
							X
						</p>
						<div className="text-center">
							<p className="text-lg font-bold text-foreground">
								{m.gameWaitingRoomDeadTitle({}, { locale })}
							</p>
							{deathInfo.killedBy && (
								<p className="mt-1 text-sm text-muted-foreground">
									{m.gameWaitingRoomKilledBy({}, { locale })}{' '}
									<span className="font-semibold text-foreground">
										{deathInfo.killedBy}
									</span>
								</p>
							)}
							<p className="mt-3 text-3xl font-bold text-primary tabular-nums">
								{deathInfo.score}
							</p>
							<p className="text-xs text-muted-foreground">
								{m.gameWaitingRoomPoints({}, { locale })}
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								type="button"
								onClick={() => {
									setPhase('idle');
								}}
								className="gap-1.5"
							>
								<PlayIcon className="h-4 w-4" />
								{m.gameWaitingRoomRetry({}, { locale })}
							</Button>
							<Button type="button" variant="outline" onClick={disconnect}>
								{m.gameWaitingRoomLeave({}, { locale })}
							</Button>
						</div>
					</div>
				)}

				{phase === 'error' && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 p-6 backdrop-blur-sm">
						<XMarkIcon className="h-10 w-10 text-destructive" />
						<div className="text-center">
							<p className="font-semibold text-foreground">
								{m.gameWaitingRoomConnectionError({}, { locale })}
							</p>
							<p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
						</div>
						<Button
							type="button"
							onClick={() => setPhase('idle')}
							variant="outline"
						>
							{m.gameWaitingRoomClose({}, { locale })}
						</Button>
					</div>
				)}

				{isPlaying && (
					<p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/60 px-3 py-1 text-center text-xs text-muted-foreground backdrop-blur-sm select-none">
						{m.gameWaitingRoomHint({}, { locale })}
					</p>
				)}
			</div>
		</div>
	);
}
