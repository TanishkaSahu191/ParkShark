import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mat } from "./materials";

function fit(g: CanvasRenderingContext2D, text: string, maxW: number, start: number, weight: string) {
  let size = start;
  while (size > 26) {
    g.font = `${weight} ${size}px sans-serif`;
    if (g.measureText(text).width <= maxW) break;
    size -= 4;
  }
  return size;
}

function paintSign(title: string, subtitle: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = subtitle ? 512 : 340;
  const g = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  if (!g) return tex;
  g.fillStyle = "#16324f";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#d4a017";
  g.fillRect(0, 0, canvas.width, 22);
  g.fillRect(0, canvas.height - 22, canvas.width, 22);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#f4efe4";
  const titleSize = fit(g, title, 940, subtitle ? 128 : 112, "700");
  g.font = `700 ${titleSize}px sans-serif`;
  g.fillText(title, canvas.width / 2, subtitle ? 190 : canvas.height / 2);
  if (subtitle) {
    g.fillStyle = "#d4a017";
    const subSize = fit(g, subtitle, 940, 62, "600");
    g.font = `600 ${subSize}px sans-serif`;
    g.fillText(subtitle, canvas.width / 2, 340);
  }
  tex.needsUpdate = true;
  return tex;
}

export function Sign({
  title,
  subtitle = "",
  position,
  yaw = 0,
  width = 6,
}: {
  title: string;
  subtitle?: string;
  position: [number, number, number];
  yaw?: number;
  width?: number;
}) {
  const tex = useMemo(() => paintSign(title, subtitle), [title, subtitle]);
  const face = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    [tex],
  );
  useEffect(
    () => () => {
      tex.dispose();
      face.dispose();
    },
    [tex, face],
  );
  const height = width * (subtitle ? 0.42 : 0.32);
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh material={mat.signBoard} position={[0, 0, -0.06]}>
        <boxGeometry args={[width, height, 0.1]} />
      </mesh>
      <mesh position={[0, 0, 0.02]} material={face}>
        <planeGeometry args={[width * 0.92, height * 0.82]} />
      </mesh>
    </group>
  );
}
