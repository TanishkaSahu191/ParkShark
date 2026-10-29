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
  qaPose: null as null | { x: number; z: number; yaw: number },
};

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
