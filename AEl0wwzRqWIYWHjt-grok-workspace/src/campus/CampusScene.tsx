import React from "react";
import { Sky } from "@react-three/drei";
import { BikeRacks } from "./BikeRacks";
import { Player } from "./Player";
import { Scenery } from "./Scenery";
import { Structures } from "./Structures";
import { NavigationPath } from "./NavigationPath";
import { useUIStore } from "@/store/useUIStore";

export function CampusScene() {
  const { theme, lowGraphics } = useUIStore();
  const isDark = theme === "dark";

  return (
    <>
      <color attach="background" args={[isDark ? "#08162b" : "#9ec8ee"]} />
      <fog attach="fog" args={[isDark ? "#0d2038" : "#c5dcf3", isDark ? 70 : 85, isDark ? 200 : 210]} />
      {isDark ? (
        <>
          <Sky sunPosition={[-60, -20, -50]} turbidity={10} rayleigh={3} mieCoefficient={0.08} />
          <hemisphereLight args={["#1c3658", "#0e2015", 0.45]} />
          <ambientLight intensity={lowGraphics ? 0.4 : 0.25} />
          <directionalLight
            position={[48, 90, 56]}
            intensity={0.65}
            color="#a5c9f5"
            castShadow={!lowGraphics}
            shadow-mapSize-width={lowGraphics ? 512 : 1024}
            shadow-mapSize-height={lowGraphics ? 512 : 1024}
            shadow-camera-near={8}
            shadow-camera-far={240}
            shadow-camera-left={-120}
            shadow-camera-right={120}
            shadow-camera-top={120}
            shadow-camera-bottom={-120}
            shadow-bias={-0.0006}
            shadow-normalBias={0.05}
          />
          <directionalLight position={[-40, 36, -28]} intensity={0.25} color="#5e82ab" />
        </>
      ) : (
        <>
          <Sky sunPosition={[80, 28, 46]} turbidity={6} rayleigh={0.7} mieCoefficient={0.004} />
          <hemisphereLight args={["#d5e7f8", "#3d6b32", 0.62]} />
          <ambientLight intensity={lowGraphics ? 0.5 : 0.35} />
          <directionalLight
            position={[48, 90, 56]}
            intensity={1.55}
            color="#fff4e4"
            castShadow={!lowGraphics}
            shadow-mapSize-width={lowGraphics ? 512 : 1024}
            shadow-mapSize-height={lowGraphics ? 512 : 1024}
            shadow-camera-near={8}
            shadow-camera-far={240}
            shadow-camera-left={-120}
            shadow-camera-right={120}
            shadow-camera-top={120}
            shadow-camera-bottom={-120}
            shadow-bias={-0.0006}
            shadow-normalBias={0.05}
          />
          <directionalLight position={[-40, 36, -28]} intensity={0.32} color="#d7e6f8" />
        </>
      )}
      <Scenery />
      <Structures />
      <BikeRacks />
      <NavigationPath />
      <Player />
    </>
  );
}
