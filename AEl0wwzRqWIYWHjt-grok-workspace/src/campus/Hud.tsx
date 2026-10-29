import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { sim } from "./sim";
import { MAP_RECTS, PLACES, ROADS, SPAWN } from "./world";

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
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (needle.current) {
        needle.current.style.transform = `rotate(${sim.yaw}rad)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="relative size-14 rounded-full border border-line bg-navy/90" aria-hidden="true">
      <div ref={needle} className="absolute inset-0">
        <span className="absolute left-1/2 top-1 -translate-x-1/2 text-xs font-semibold text-gold">N</span>
        <span className="absolute left-1/2 top-3 h-5 w-0.5 -translate-x-1/2 bg-gold" />
      </div>
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
  const [help, setHelp] = useState(true);
  const [places, setPlaces] = useState(false);
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

  const enter = () => {
    setHelp(false);
    const canvas = document.querySelector("canvas");
    if (canvas && !touchUi) {
      canvas.requestPointerLock?.()?.catch(() => undefined);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="pointer-events-auto absolute top-3 left-3 max-w-56 rounded-lg border border-line bg-navy/90 px-3 py-2 text-paper md:max-w-sm md:px-4 md:py-3">
        <p className="text-xs tracking-wide text-gold uppercase">Vellore</p>
        <h1 className="font-display text-xl leading-tight md:text-2xl">VIT Campus Walk</h1>
        <p className="mt-1 text-sm text-paper/80">{snap.place}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="inline-flex h-11 items-center gap-1 rounded-lg bg-gold px-3 text-sm font-semibold text-ink"
            onClick={() => setPlaces((open) => !open)}
          >
            <MapPin className="size-4" aria-hidden="true" />
            Places
          </button>
          {!help && (
            <button
              type="button"
              className="h-11 rounded-lg border border-line px-3 text-sm font-semibold text-paper"
              onClick={() => setHelp(true)}
            >
              Controls
            </button>
          )}
        </div>
      </div>

      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <MiniMap />
        <div className="hidden md:block">
          <Compass />
        </div>
      </div>

      {places && (
        <div className="pointer-events-auto absolute top-28 right-3 left-3 max-h-72 overflow-y-auto rounded-lg border border-line bg-paper p-3 text-ink md:right-auto md:w-80">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-lg">Campus places</p>
            <button type="button" className="grid size-11 place-items-center rounded-lg" onClick={() => setPlaces(false)} aria-label="Close places">
              <X className="size-5" />
            </button>
          </div>
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.name} className="flex items-baseline justify-between gap-3 border-b border-line py-1 text-sm">
                <span className="font-semibold">{row.name}</span>
                <span className="text-ink/70">
                  {Math.round(row.dist)} m · {row.hint}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {help && !touchUi && (
        <div className="pointer-events-auto absolute bottom-4 left-4 w-80 max-w-full rounded-lg border border-line bg-paper p-4 text-ink">
          <p className="font-display text-lg">Walk the campus</p>
          <p className="mt-1 text-sm leading-relaxed">
            You start at the main gate. Academic blocks, hostels, and 150 numbered bicycle stands are all on this grounds.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>W A S D — move, relative to the camera</li>
            <li>Drag the mouse — look around</li>
            <li>Shift — run, Space — jump</li>
          </ul>
          <button
            type="button"
            className="mt-4 h-11 rounded-lg bg-gold px-4 text-sm font-semibold text-ink"
            onClick={enter}
          >
            Dismiss
          </button>
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
