export const sim = {
  x: 0,
  y: 0,
  z: 82,
  yaw: 0,
  speed: 0,
  grounded: true,
  place: "Main Gate",
  keys: new Set<string>(),
  touchX: 0,
  touchY: 0,
  runHeld: false,
  jumpHeld: false,
  lookX: 0,
  lookY: 0,
  resetNorth: false,
  targetYaw: null as number | null,
  qaPose: null as null | { x: number; z: number; yaw: number },
  autoNavWaypoints: [] as [number, number][],
  autoNavActive: false,
};

export function resetCameraToNorth() {
  sim.resetNorth = true;
}

export function setCameraYaw(targetAngle: number) {
  sim.targetYaw = targetAngle;
}

export function startAutoNav(waypoints: [number, number][]) {
  // Omit the immediate current position if it's the first point
  const points = waypoints.length > 1 ? waypoints.slice(1) : waypoints;
  sim.autoNavWaypoints = [...points];
  sim.autoNavActive = true;
}

export function stopAutoNav() {
  sim.autoNavWaypoints = [];
  sim.autoNavActive = false;
}

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getX: () => number;
  getZ: () => number;
  setKeys: (codes: string[]) => void;
  setPose: (x: number, z: number, yaw: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
    __campus?: { slotIds: string[]; placeNames: string[] };
  }
}
