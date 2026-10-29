import * as THREE from "three";

function std(color: string, roughness = 0.86, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function colored(hex: string, roughness = 0.86, metalness = 0.02) {
  const key = `${hex}|${roughness}|${metalness}`;
  let material = cache.get(key);
  if (!material) {
    material = std(hex, roughness, metalness);
    cache.set(key, material);
  }
  return material;
}

export const mat = {
  grass: std("#5b9444", 1, 0),
  grassDark: std("#467836", 1, 0),
  road: std("#5a6270", 0.96, 0.02),
  path: std("#d9c7a4", 0.94, 0),
  concrete: std("#cfc6b8", 0.92, 0),
  line: std("#f4efe4", 0.7, 0),
  yellow: std("#e0b33a", 0.55, 0.05),
  metal: std("#2c3642", 0.4, 0.74),
  metalDark: std("#1a222c", 0.5, 0.62),
  glass: std("#ffffff", 0.14, 0.42),
  door: std("#1a2330", 0.55, 0.08),
  trunk: std("#6b4a32", 0.95, 0),
  leaf: std("#ffffff", 0.9, 0),
  water: std("#3a8eb5", 0.18, 0.12),
  seat: std("#b5654a", 0.78, 0),
  stage: std("#8d6b45", 0.75, 0),
  backdrop: std("#16324f", 0.7, 0.04),
  stone: std("#d9cdb6", 0.9, 0),
  gold: std("#d4a017", 0.42, 0.38),
  signBoard: std("#0e2238", 0.62, 0.08),
  skin: std("#e0b08c", 0.72, 0),
  hair: std("#241c16", 0.82, 0),
  shirt: std("#16324f", 0.72, 0.03),
  pants: std("#2c3344", 0.82, 0),
  shoe: std("#161616", 0.6, 0.04),
  eye: std("#141414", 0.35, 0),
  fence: std("#e6e0d2", 0.92, 0),
  asphalt: std("#3e4550", 0.97, 0.02),
  hedge: std("#2d6b34", 0.95, 0),
  bulb: new THREE.MeshStandardMaterial({
    color: "#fff6d8",
    emissive: "#ffe7a8",
    emissiveIntensity: 0.85,
    roughness: 0.4,
  }),
  shadow: new THREE.MeshBasicMaterial({
    color: "#142033",
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  }),
};
