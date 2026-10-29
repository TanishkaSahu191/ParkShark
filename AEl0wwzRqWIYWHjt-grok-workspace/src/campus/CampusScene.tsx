import { Sky } from "@react-three/drei";
import { BikeRacks } from "./BikeRacks";
import { Player } from "./Player";
import { Scenery } from "./Scenery";
import { Structures } from "./Structures";

export function CampusScene() {
  return (
    <>
      <color attach="background" args={["#9ec8ee"]} />
      <fog attach="fog" args={["#c5dcf3", 85, 210]} />
      <Sky sunPosition={[80, 28, 46]} turbidity={6} rayleigh={0.7} mieCoefficient={0.004} />
      <hemisphereLight args={["#d5e7f8", "#3d6b32", 0.62]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        position={[48, 90, 56]}
        intensity={1.55}
        color="#fff4e4"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
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
      <Scenery />
      <Structures />
      <BikeRacks />
      <Player />
    </>
  );
}
