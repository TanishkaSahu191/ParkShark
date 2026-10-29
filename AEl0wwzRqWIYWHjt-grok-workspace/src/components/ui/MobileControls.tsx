import React, { useRef, useState } from "react";
import { Zap, ArrowUp } from "lucide-react";
import { sim } from "@/campus/sim";

export const MobileControls: React.FC = () => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const activeTouchId = useRef<number | null>(null);

  const RADIUS = 48; // Max thumbstick displacement px

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch || !joystickRef.current) return;

    activeTouchId.current = touch.identifier;
    setIsDragging(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        activeTouchId.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        sim.touchX = 0;
        sim.touchY = 0;
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }

    setKnobPos({ x: dx, y: dy });

    // Map to normalized simulation axes (-1 to 1)
    // Forward in 3D scene iz is +1, which corresponds to pulling thumbstick up (-dy)
    sim.touchX = dx / RADIUS;
    sim.touchY = -dy / RADIUS;
  };

  // Toggle run
  const toggleRun = () => {
    const next = !isRunning;
    setIsRunning(next);
    sim.runHeld = next;
  };

  // Trigger jump
  const triggerJump = () => {
    sim.jumpHeld = true;
    setTimeout(() => {
      sim.jumpHeld = false;
    }, 180);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-18 z-30 px-6 flex justify-between items-end select-none">
      {/* Virtual Joystick */}
      <div
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="pointer-events-auto size-28 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/20 flex items-center justify-center relative touch-none shadow-lg active:bg-slate-900/50"
      >
        {/* Direction Crosshairs */}
        <div className="absolute inset-x-4 h-px bg-white/10" />
        <div className="absolute inset-y-4 w-px bg-white/10" />

        {/* Thumb Knob */}
        <div
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
          className={`size-12 rounded-full shadow-md transition-colors ${
            isDragging
              ? "bg-[#1d4ed8] border-2 border-white text-white"
              : "bg-white/70 dark:bg-slate-200/60 border border-white/50"
          }`}
        />
      </div>

      {/* Action Buttons (Sprint & Jump) */}
      <div className="pointer-events-auto flex flex-col gap-3">
        {/* Sprint Button */}
        <button
          onClick={toggleRun}
          aria-label="Toggle sprint"
          className={`size-14 rounded-full flex items-center justify-center shadow-lg border transition-all active:scale-95 ${
            isRunning
              ? "bg-[#d4a017] text-slate-900 border-white ring-4 ring-amber-400/40 font-bold"
              : "bg-slate-900/50 backdrop-blur-md text-white border-white/20 hover:bg-slate-900/70"
          }`}
        >
          <Zap className="size-6 fill-current" />
        </button>

        {/* Jump Button */}
        <button
          onClick={triggerJump}
          aria-label="Jump"
          className="size-14 rounded-full bg-[#1d4ed8]/85 hover:bg-[#1d4ed8] backdrop-blur-md text-white border border-white/30 flex items-center justify-center shadow-lg active:scale-90 active:bg-blue-700"
        >
          <ArrowUp className="size-6 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
