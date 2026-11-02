import { useEffect, useRef, useState } from "react";
import { MapPin, X, Flame } from "lucide-react";
import { sim, resetCameraToNorth } from "./sim";
import { MAP_RECTS, PLACES, ROADS, SPAWN } from "./world";
import { useBikesStore } from "@/store/useBikesStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";

type Snap = { x: number; z: number; yaw: number; place: string; speed: number };

function useSnap() {
  const [snap, setSnap] = useState<Snap>({
    x: SPAWN.x,
    z: SPAWN.z,
    yaw: SPAWN.yaw,
    place: "Main Gate",
    speed: 0,
  });
  useEffect(() => {
    const id = window.setInterval(() => {
      setSnap({
        x: sim.x,
        z: sim.z,
        yaw: sim.yaw,
        place: sim.place,
        speed: sim.speed,
      });
    }, 200);
    return () => window.clearInterval(id);
  }, []);
  return snap;
}

function MiniMap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 160;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const minX = -100;
    const maxX = 100;
    const minZ = -98;
    const maxZ = 104;
    let frame = 0;
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#467836";
      ctx.fillRect(0, 0, size, size);
      const project = (x: number, z: number) => [
        ((x - minX) / (maxX - minX)) * size,
        ((maxZ - z) / (maxZ - minZ)) * size,
      ];
      ctx.fillStyle = "#5a6270";
      for (const road of ROADS) {
        const [cx, cy] = project(road.x, road.z);
        const rw = (road.w / (maxX - minX)) * size;
        const rh = (road.d / (maxZ - minZ)) * size;
        ctx.fillRect(cx - rw / 2, cy - rh / 2, rw, rh);
      }
      for (const rect of MAP_RECTS) {
        const [cx, cy] = project(rect.x, rect.z);
        const rw = (rect.w / (maxX - minX)) * size;
        const rh = (rect.d / (maxZ - minZ)) * size;
        ctx.fillStyle = rect.color;
        ctx.fillRect(cx - rw / 2, cy - rh / 2, rw, rh);
      }
      const [px, py] = project(sim.x, sim.z);

      // Render active navigation route and destination beacon on minimap
      const { navigatingStandId, getStandById } = useBikesStore.getState();
      if (navigatingStandId) {
        const targetStand = getStandById(navigatingStandId);
        if (targetStand) {
          const [tx, ty] = project(targetStand.position.x, targetStand.position.z);
          ctx.save();
          // Dashed guide line
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          // Pulsing target beacon marker
          const pulse = (Math.sin(Date.now() / 180) + 1) / 2;
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(tx, ty, 3 + pulse * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-sim.yaw);
      ctx.fillStyle = "#d4a017";
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#f4efe4";
      ctx.font = "700 12px sans-serif";
      ctx.fillText("N", size / 2 - 4, 14);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <canvas
      ref={ref}
      aria-label="Campus map"
      className="pointer-events-none size-24 rounded-lg border border-line bg-navy md:size-40"
    />
  );
}

function Compass() {
  const needle = useRef<HTMLDivElement>(null);
  const [heading, setHeading] = useState("N 0°");
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    let frame = 0;
    let lastDeg = -1;
    const tick = () => {
      if (needle.current) {
        needle.current.style.transform = `rotate(${sim.yaw}rad)`;
      }
      // Compute cardinal + degrees
      const rawDeg = Math.round(((-sim.yaw * 180) / Math.PI) % 360);
      const deg = rawDeg < 0 ? rawDeg + 360 : rawDeg;
      if (Math.abs(deg - lastDeg) >= 2) {
        lastDeg = deg;
        let card = "N";
        if (deg >= 338 || deg < 23) card = "N";
        else if (deg >= 23 && deg < 68) card = "NE";
        else if (deg >= 68 && deg < 113) card = "E";
        else if (deg >= 113 && deg < 158) card = "SE";
        else if (deg >= 158 && deg < 203) card = "S";
        else if (deg >= 203 && deg < 248) card = "SW";
        else if (deg >= 248 && deg < 293) card = "W";
        else if (deg >= 293 && deg < 338) card = "NW";
        setHeading(`${card} ${deg}°`);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.hypot(dx, dy) > 3) {
      moved.current = true;
      // Direct tactile camera rotation
      sim.lookX += dx * 3.5;
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!moved.current) {
      // Clean click: smoothly reset to North!
      resetCameraToNorth();
    }
    dragStart.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already lost
    }
  };

  return (
    <div className="flex flex-col items-center group pointer-events-auto select-none">
      <button
        type="button"
        title="Campus Compass: Click to face North (N) • Drag to rotate camera"
        aria-label="Campus Compass - Click to face North, drag to rotate camera"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative size-14 sm:size-16 rounded-full border-2 border-sky-400/50 hover:border-sky-300 bg-slate-950/90 dark:bg-[#07192f]/95 shadow-xl shadow-black/50 backdrop-blur-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform ring-1 ring-white/10 group-hover:ring-sky-400/40"
      >
        {/* Subtle cardinal markings on the dial */}
        <span className="absolute top-1 text-[9px] font-black tracking-widest text-amber-400">N</span>
        <span className="absolute right-1 text-[8px] font-bold text-slate-400">E</span>
        <span className="absolute bottom-1 text-[8px] font-bold text-slate-400">S</span>
        <span className="absolute left-1 text-[8px] font-bold text-slate-400">W</span>

        {/* 45 degree tick marks ring */}
        <div className="absolute inset-2 rounded-full border border-slate-700/40 pointer-events-none" />

        {/* The rotating Needle */}
        <div
          ref={needle}
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75"
        >
          <svg viewBox="0 0 56 56" className="size-full">
            {/* North half needle (Red / Gold) */}
            <polygon
              points="28,8 24,28 28,24"
              fill="#ef4444"
              stroke="#b91c1c"
              strokeWidth="0.5"
            />
            <polygon
              points="28,8 32,28 28,24"
              fill="#f87171"
              stroke="#b91c1c"
              strokeWidth="0.5"
            />
            {/* South half needle (Silver / Slate) */}
            <polygon
              points="28,48 24,28 28,32"
              fill="#64748b"
              stroke="#475569"
              strokeWidth="0.5"
            />
            <polygon
              points="28,48 32,28 28,32"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="0.5"
            />
            {/* Center brass pivot */}
            <circle cx="28" cy="28" r="3.2" fill="#facc15" stroke="#1e293b" strokeWidth="1.2" />
            <circle cx="28" cy="28" r="1.2" fill="#ffffff" />
          </svg>
        </div>
      </button>

      {/* Live Heading Pill */}
      <span className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight bg-slate-900/90 text-sky-300 border border-slate-700/70 shadow-sm backdrop-blur-sm pointer-events-none">
        {heading}
      </span>
    </div>
  );
}

function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const max = 40;
  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!origin.current || origin.current.id !== e.pointerId) return;
    origin.current = null;
    sim.touchX = 0;
    sim.touchY = 0;
    setKnob({ x: 0, y: 0 });
  };
  return (
    <div
      role="application"
      aria-label="Move"
      className="relative size-28 touch-none rounded-full border border-line bg-navy/85"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!origin.current || origin.current.id !== e.pointerId) return;
        const dx = e.clientX - origin.current.x;
        const dy = e.clientY - origin.current.y;
        const mag = Math.hypot(dx, dy) || 1;
        const k = mag > max ? max / mag : 1;
        const cx = dx * k;
        const cy = dy * k;
        sim.touchX = cx / max;
        sim.touchY = -cy / max;
        setKnob({ x: cx, y: cy });
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span
        className="absolute top-1/2 left-1/2 size-12 rounded-full bg-gold"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

function LookPad() {
  const last = useRef<{ id: number; x: number; y: number } | null>(null);
  return (
    <div
      role="application"
      aria-label="Drag to look"
      className="flex h-28 w-24 touch-none items-center justify-center rounded-lg border border-line bg-navy/75 text-sm font-semibold text-paper"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!last.current || last.current.id !== e.pointerId) return;
        sim.lookX += e.clientX - last.current.x;
        sim.lookY += e.clientY - last.current.y;
        last.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => {
        last.current = null;
      }}
      onPointerCancel={() => {
        last.current = null;
      }}
    >
      Look
    </div>
  );
}

export function Hud() {
  const snap = useSnap();
  const { user } = useAuthStore();
  const { heatmapMode, toggleHeatmapMode } = useBikesStore();
  const { showPlaces, setShowPlaces } = useUIStore();
  const [touchUi, setTouchUi] = useState(false);
  useEffect(() => {
    const apply = () => {
      setTouchUi(window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const rows = PLACES.map((place) => {
    const dx = place.x - snap.x;
    const dz = place.z - snap.z;
    const dist = Math.hypot(dx, dz);
    const targetYaw = Math.atan2(-dx, -dz);
    const rel = Math.atan2(Math.sin(targetYaw - snap.yaw), Math.cos(targetYaw - snap.yaw));
    let hint = "Ahead";
    if (dist < 12) hint = "Here";
    else if (rel > 2.2 || rel < -2.2) hint = "Behind";
    else if (rel > 0.45) hint = "Left";
    else if (rel < -0.45) hint = "Right";
    return { name: place.name, dist, hint };
  }).sort((a, b) => a.dist - b.dist);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="pointer-events-auto absolute top-3 left-3 max-w-56 rounded-lg border border-line bg-navy/90 px-3 py-2 text-paper md:max-w-sm md:px-4 md:py-3 shadow-xl backdrop-blur-md">
        <p className="text-xs tracking-wide text-gold uppercase">Vellore</p>
        <h1 className="font-display text-xl leading-tight md:text-2xl">VIT Campus Walk</h1>
        <p className="mt-1 text-sm text-paper/80">{snap.place}</p>
      </div>

      <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-2.5 z-20">
        <MiniMap />
        <Compass />

        {/* Phase 7 Requirement 3: Admin 3D Scene Heatmap Toggle */}
        {user?.role === "admin" && (
          <button
            type="button"
            onClick={toggleHeatmapMode}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-lg transition-all ${
              heatmapMode
                ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white border-rose-400 ring-2 ring-rose-500/50"
                : "bg-slate-900/90 text-slate-200 border-slate-700 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Flame className="size-4 text-orange-400" />
            <span>3D Heatmap: {heatmapMode ? "ON" : "OFF"}</span>
          </button>
        )}

        {heatmapMode && (
          <div className="pointer-events-auto rounded-lg border border-slate-700/80 bg-slate-950/90 p-2.5 text-[10px] text-white shadow-xl backdrop-blur-md max-w-[160px]">
            <div className="font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
              <Flame className="size-3 text-orange-400" />
              <span>Rack Utilization</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#0284c7] via-[#eab308] to-[#ef4444] mb-1" />
            <div className="flex justify-between text-slate-400 font-mono">
              <span>Low</span>
              <span>Med</span>
              <span>High</span>
            </div>
          </div>
        )}
      </div>

      {showPlaces && (
        <div className="pointer-events-auto absolute top-28 right-3 left-3 max-h-72 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-xl md:right-auto md:w-84 z-30">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-400" />
              <p className="font-display text-lg font-bold">Campus Places</p>
            </div>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              onClick={() => setShowPlaces(false)}
              aria-label="Close places"
            >
              <X className="size-5" />
            </button>
          </div>
          <ul className="space-y-1.5 divide-y divide-slate-800/60">
            {rows.map((row) => (
              <li key={row.name} className="flex items-baseline justify-between gap-3 pt-1.5 text-xs">
                <span className="font-semibold text-slate-200">{row.name}</span>
                <span className="text-sky-400 font-mono text-[11px]">
                  {Math.round(row.dist)} m &bull; {row.hint}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}



      {touchUi && (
        <div className="pointer-events-auto absolute right-3 bottom-3 left-3 flex items-end justify-between gap-3">
          <Joystick />
          <LookPad />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="h-14 w-14 rounded-full border border-line bg-navy text-sm font-semibold text-paper"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                sim.runHeld = true;
              }}
              onPointerUp={() => {
                sim.runHeld = false;
              }}
              onPointerCancel={() => {
                sim.runHeld = false;
              }}
            >
              Run
            </button>
            <button
              type="button"
              className="h-14 w-14 rounded-full bg-gold text-sm font-semibold text-ink"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                sim.jumpHeld = true;
              }}
              onPointerUp={() => {
                sim.jumpHeld = false;
              }}
              onPointerCancel={() => {
                sim.jumpHeld = false;
              }}
            >
              Jump
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
