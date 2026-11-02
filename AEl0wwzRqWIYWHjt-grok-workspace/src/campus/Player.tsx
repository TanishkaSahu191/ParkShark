import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mat } from "./materials";
import { sim } from "./sim";
import { SLOTS, SPAWN, PLACES, cameraBlocked, placeAt, resolve } from "./world";
import { useBikesStore } from "@/store/useBikesStore";

const RADIUS = 0.42;
const WALK = 4.6;
const RUN = 8.8;
const _resolved = { x: 0, z: 0 };
const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();

function readPad() {
  const pads = navigator.getGamepads?.();
  if (!pads) return null;
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i];
    if (pad) return pad;
  }
  return null;
}

export function Player() {
  const rig = useRef<THREE.Group>(null);
  const facing = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const forearmL = useRef<THREE.Group>(null);
  const forearmR = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const yaw = useRef(SPAWN.yaw);
  const pitch = useRef(0.38);
  const face = useRef(SPAWN.yaw);
  const turnTilt = useRef(0);
  const pos = useRef({ x: SPAWN.x, y: 0, z: SPAWN.z });
  const vy = useRef(0);
  const speed = useRef(0);
  const prevJump = useRef(false);
  const camReady = useRef(false);
  const phase = useRef(0);
  const { camera, gl } = useThree();

  useEffect(() => {
    const keys = sim.keys;
    const el = gl.domElement;
    el.style.touchAction = "none";
    const gameKeys = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "ShiftLeft",
      "ShiftRight",
    ]);
    const onDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.getAttribute("role") === "dialog" ||
          active.closest?.("[role='dialog']") ||
          active.closest?.("[data-modal='true']"))
      ) {
        return;
      }
      if (e.code === "KeyN") {
        sim.resetNorth = true;
      }
      if (e.repeat) return;
      keys.add(e.code);
      if (gameKeys.has(e.code)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };
    const clear = () => keys.clear();
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerId = -1;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      pointerId = e.pointerId;
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (document.pointerLockElement) {
        sim.lookX += e.movementX;
        sim.lookY += e.movementY;
        return;
      }
      if (!dragging || e.pointerId !== pointerId) return;
      sim.lookX += e.clientX - lastX;
      sim.lookY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === pointerId) dragging = false;
    };
    const onContext = (e: Event) => e.preventDefault();
    const onVis = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", onVis);
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("contextmenu", onContext);

    window.__controlsTest = {
      getYaw: () => sim.yaw,
      getSpeed: () => sim.speed,
      getX: () => sim.x,
      getZ: () => sim.z,
      setKeys: (codes: string[]) => {
        keys.clear();
        for (const code of codes) keys.add(code);
      },
      setPose: (x: number, z: number, yawValue: number) => {
        sim.qaPose = { x, z, yaw: yawValue };
        sim.touchX = 0;
        sim.touchY = 0;
        sim.runHeld = false;
        sim.jumpHeld = false;
        sim.lookX = 0;
        sim.lookY = 0;
      },
    };
    window.__campus = {
      slotIds: SLOTS.map((slot) => slot.id),
      placeNames: PLACES.map((place) => place.name),
    };

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("contextmenu", onContext);
      delete window.__controlsTest;
    };
  }, [gl]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const pose = sim.qaPose;
    if (pose) {
      pos.current.x = pose.x;
      pos.current.y = 0;
      pos.current.z = pose.z;
      vy.current = 0;
      speed.current = 0;
      yaw.current = pose.yaw;
      face.current = pose.yaw;
      turnTilt.current = 0;
      sim.qaPose = null;
      camReady.current = false;
    }

    yaw.current -= sim.lookX * 0.0022;
    pitch.current = Math.max(0.18, Math.min(1.02, pitch.current + sim.lookY * 0.002));
    sim.lookX = 0;
    sim.lookY = 0;

    // Smooth reset orientation to North (yaw = 0, comfortable pitch = 0.35)
    if (sim.resetNorth) {
      const targetPitch = 0.35;
      const yawDiff = Math.atan2(Math.sin(-yaw.current), Math.cos(-yaw.current));
      const pitchDiff = targetPitch - pitch.current;

      if (Math.abs(yawDiff) < 0.015 && Math.abs(pitchDiff) < 0.015) {
        yaw.current = 0;
        pitch.current = targetPitch;
        sim.resetNorth = false;
      } else {
        yaw.current += yawDiff * Math.min(1, dt * 10);
        pitch.current += pitchDiff * Math.min(1, dt * 10);
      }
    } else if (typeof sim.targetYaw === "number") {
      const yawDiff = Math.atan2(Math.sin(sim.targetYaw - yaw.current), Math.cos(sim.targetYaw - yaw.current));
      if (Math.abs(yawDiff) < 0.015) {
        yaw.current = sim.targetYaw;
        sim.targetYaw = null;
      } else {
        yaw.current += yawDiff * Math.min(1, dt * 10);
      }
    }

    let ix = sim.touchX;
    let iz = sim.touchY;

    // Manual keyboard cancel of auto-navigation
    if (sim.keys.size > 0 && sim.autoNavActive) {
      sim.autoNavActive = false;
      sim.autoNavWaypoints = [];
    }

    // Auto-navigation waypoint follower
    let runHeld = sim.runHeld || sim.keys.has("ShiftLeft") || sim.keys.has("ShiftRight");
    if (sim.autoNavActive && sim.autoNavWaypoints.length > 0) {
      const [wx, wz] = sim.autoNavWaypoints[0];
      const dx = wx - pos.current.x;
      const dz = wz - pos.current.z;
      const distWp = Math.hypot(dx, dz);

      if (distWp < 1.4) {
        sim.autoNavWaypoints.shift();
        if (sim.autoNavWaypoints.length === 0) {
          sim.autoNavActive = false;
        }
      } else {
        const targetYaw = Math.atan2(-dx, -dz);
        const yawDiff = Math.atan2(Math.sin(targetYaw - yaw.current), Math.cos(targetYaw - yaw.current));
        yaw.current += yawDiff * Math.min(1, dt * 7.5);
        face.current = yaw.current;

        iz += 1;
        runHeld = true; // Use swift movement along route
      }
    }

    if (sim.keys.has("KeyW") || sim.keys.has("ArrowUp")) iz += 1;
    if (sim.keys.has("KeyS") || sim.keys.has("ArrowDown")) iz -= 1;
    if (sim.keys.has("KeyD") || sim.keys.has("ArrowRight")) ix += 1;
    if (sim.keys.has("KeyA") || sim.keys.has("ArrowLeft")) ix -= 1;

    const pad = readPad();
    let jumpHeld = sim.jumpHeld || sim.keys.has("Space");
    if (pad) {
      const gx = pad.axes[0] ?? 0;
      const gy = pad.axes[1] ?? 0;
      const magPad = Math.hypot(gx, gy);
      const dead = 0.18;
      if (magPad > dead) {
        const scale = (magPad - dead) / ((1 - dead) * magPad);
        ix += gx * scale;
        iz += -gy * scale;
      }
      if (pad.buttons[12]?.pressed) iz += 1;
      if (pad.buttons[13]?.pressed) iz -= 1;
      if (pad.buttons[15]?.pressed) ix += 1;
      if (pad.buttons[14]?.pressed) ix -= 1;
      if (pad.buttons[0]?.pressed) jumpHeld = true;
      if (pad.buttons[5]?.pressed || (pad.buttons[7]?.value ?? 0) > 0.45) runHeld = true;
    }

    let inputMag = Math.hypot(ix, iz);
    if (inputMag > 1) {
      ix /= inputMag;
      iz /= inputMag;
      inputMag = 1;
    }

    const target = inputMag > 0.04 ? (runHeld ? RUN : WALK) * inputMag : 0;
    speed.current += (target - speed.current) * Math.min(1, dt * 12);

    const sin = Math.sin(yaw.current);
    const cos = Math.cos(yaw.current);
    const fx = -sin;
    const fz = -cos;
    const rx = cos;
    const rz = -sin;

    let moveX = 0;
    let moveZ = 0;
    if (inputMag > 0.04 && speed.current > 0.01) {
      const mx = fx * iz + rx * ix;
      const mz = fz * iz + rz * ix;
      const move = Math.hypot(mx, mz) || 1;
      moveX = mx / move;
      moveZ = mz / move;
      const step = speed.current * dt;
      pos.current.x += moveX * step;
      pos.current.z += moveZ * step;
    }

    resolve(pos.current.x, pos.current.z, RADIUS, _resolved);
    pos.current.x = _resolved.x;
    pos.current.z = _resolved.z;

    const grounded = pos.current.y <= 0.001;
    if (jumpHeld && !prevJump.current && grounded) vy.current = 6.5;
    prevJump.current = jumpHeld;
    vy.current -= 20 * dt;
    pos.current.y += vy.current * dt;
    if (pos.current.y <= 0) {
      pos.current.y = 0;
      vy.current = 0;
    }

    // Directional orientation: smoothly align body with real movement direction vector
    if (inputMag > 0.04 && speed.current > 0.15 && (moveX !== 0 || moveZ !== 0)) {
      const moveAngle = Math.atan2(-moveX, -moveZ);
      const turnDiff = Math.atan2(Math.sin(moveAngle - face.current), Math.cos(moveAngle - face.current));
      const turnSpeed = runHeld ? 14 : 11;
      face.current += turnDiff * Math.min(1, dt * turnSpeed);

      // Bank body slightly into the turn
      turnTilt.current = THREE.MathUtils.lerp(turnTilt.current, turnDiff * 0.18, Math.min(1, dt * 8));
    } else {
      turnTilt.current = THREE.MathUtils.lerp(turnTilt.current, 0, Math.min(1, dt * 8));
    }

    const moving = speed.current > 0.35 && grounded;
    if (moving) {
      const cadence = runHeld ? 13.5 : 9.5;
      phase.current += dt * cadence * Math.min(1.4, Math.max(0.6, speed.current / WALK));
    }

    const p = phase.current;
    const time = state.clock.elapsedTime;

    let thighL = 0;
    let thighR = 0;
    let kneeRotL = 0;
    let kneeRotR = 0;
    let armSwingL = 0;
    let armSwingR = 0;
    let elbowRotL = 0.15;
    let elbowRotR = 0.15;
    let torsoLean = 0;
    let torsoTwist = 0;
    let torsoSway = 0;

    if (!grounded) {
      // Jumping / air posture
      thighL = -0.32;
      thighR = 0.22;
      kneeRotL = 0.75;
      kneeRotR = 0.90;
      armSwingL = -0.65;
      armSwingR = -0.65;
      elbowRotL = 0.75;
      elbowRotR = 0.75;
      torsoLean = 0.12;
    } else if (moving) {
      // Natural walking / sprinting gait cycle with realistic joint flexion
      const amp = runHeld ? 0.82 : 0.60;
      thighL = Math.sin(p) * amp;
      thighR = Math.sin(p + Math.PI) * amp;

      // Real knee mechanics: knee ONLY flexes backward during leg forward swing
      kneeRotL = Math.max(0, Math.sin(p - 0.35)) * (runHeld ? 1.15 : 0.85);
      kneeRotR = Math.max(0, Math.sin(p + Math.PI - 0.35)) * (runHeld ? 1.15 : 0.85);

      // Arms swing cross-body opposite to legs
      armSwingL = -Math.sin(p) * (runHeld ? 0.72 : 0.52);
      armSwingR = -Math.sin(p + Math.PI) * (runHeld ? 0.72 : 0.52);

      // Elbow flexes when swinging forward
      elbowRotL = 0.22 + Math.max(0, -armSwingL) * (runHeld ? 0.85 : 0.55);
      elbowRotR = 0.22 + Math.max(0, -armSwingR) * (runHeld ? 0.85 : 0.55);

      // Realistic torso dynamics (pelvis weight transfer, counter-twist & lean)
      torsoLean = runHeld ? 0.14 : 0.07;
      torsoTwist = -Math.sin(p) * 0.055;
      torsoSway = Math.sin(p) * 0.035;
    } else {
      // Natural idle stance with subtle breathing and relaxed arm posture
      const breath = Math.sin(time * 2.2) * 0.012;
      const idleArm = Math.sin(time * 2.2 + 0.4) * 0.02;
      armSwingL = idleArm;
      armSwingR = idleArm;
      elbowRotL = 0.18 + breath;
      elbowRotR = 0.18 + breath;
    }

    if (legL.current) legL.current.rotation.x = thighL;
    if (kneeL.current) kneeL.current.rotation.x = kneeRotL;
    if (legR.current) legR.current.rotation.x = thighR;
    if (kneeR.current) kneeR.current.rotation.x = kneeRotR;

    if (armL.current) {
      armL.current.rotation.x = armSwingL;
      armL.current.rotation.z = 0.08;
    }
    if (forearmL.current) {
      forearmL.current.rotation.x = -elbowRotL;
    }

    if (armR.current) {
      armR.current.rotation.x = armSwingR;
      armR.current.rotation.z = -0.08;
    }
    if (forearmR.current) {
      forearmR.current.rotation.x = -elbowRotR;
    }

    if (torso.current) {
      const breathY = moving ? 0 : Math.sin(time * 2.2) * 0.008;
      torso.current.position.y = 0.88 + breathY;
      torso.current.rotation.x = torsoLean;
      torso.current.rotation.y = torsoTwist;
      torso.current.rotation.z = torsoSway;
    }

    // Double vertical gait bob per full stride
    const bob = moving ? Math.abs(Math.sin(p)) * 0.042 : 0;
    if (rig.current) rig.current.position.set(pos.current.x, pos.current.y + bob, pos.current.z);

    if (facing.current) {
      facing.current.rotation.y = face.current + Math.PI;
      facing.current.rotation.z = -turnTilt.current;
    }
    if (shadow.current) {
      shadow.current.position.set(pos.current.x, 0.03, pos.current.z);
      const s = pos.current.y > 0.15 ? 0.72 : 1;
      shadow.current.scale.set(s, s, s);
    }

    let dist = 7.2;
    const cosPitch = Math.cos(pitch.current);
    for (let i = 1; i <= 8; i++) {
      const t = (dist * i) / 8;
      const cx = pos.current.x - fx * t * cosPitch;
      const cz = pos.current.z - fz * t * cosPitch;
      if (cameraBlocked(cx, cz, 0.4)) {
        dist = Math.max(2.15, ((i - 1) / 8) * 7.2);
        break;
      }
    }
    const hd = dist * Math.cos(pitch.current);
    const lift = dist * Math.sin(pitch.current);
    _desired.set(
      pos.current.x - fx * hd,
      pos.current.y + 1.55 + lift,
      pos.current.z - fz * hd,
    );
    if (!camReady.current) {
      camera.position.copy(_desired);
      camReady.current = true;
    } else {
      camera.position.lerp(_desired, 1 - Math.exp(-8 * dt));
    }
    _look.set(pos.current.x, pos.current.y + 1.35, pos.current.z);
    camera.lookAt(_look);

    sim.x = pos.current.x;
    sim.y = pos.current.y;
    sim.z = pos.current.z;
    sim.yaw = yaw.current;
    sim.speed = speed.current;
    sim.grounded = pos.current.y <= 0.001;
    sim.place = placeAt(pos.current.x, pos.current.z);
    useBikesStore.getState().setPlayerPosition(pos.current.x, pos.current.z);
  });

  return (
    <group>
      <group ref={rig} position={[SPAWN.x, 0, SPAWN.z]}>
        <group ref={facing}>
          {/* Upper Body (Torso, Head, Articulated Arms) */}
          <group ref={torso} position={[0, 0.88, 0]}>
            {/* Shirt / Torso */}
            <mesh position={[0, 0.28, 0]} material={mat.shirt} castShadow>
              <boxGeometry args={[0.46, 0.56, 0.24]} />
            </mesh>
            {/* Gold ID Card / Badge */}
            <mesh position={[0, 0.36, 0.13]} material={mat.gold}>
              <boxGeometry args={[0.22, 0.07, 0.03]} />
            </mesh>
            {/* Head */}
            <mesh position={[0, 0.70, 0]} material={mat.skin} castShadow>
              <sphereGeometry args={[0.16, 16, 14]} />
            </mesh>
            {/* Hair */}
            <mesh position={[0, 0.82, -0.02]} scale={[1.02, 0.62, 1]} material={mat.hair}>
              <sphereGeometry args={[0.17, 14, 10]} />
            </mesh>
            {/* Eyes */}
            <mesh position={[-0.055, 0.72, 0.13]} material={mat.eye}>
              <sphereGeometry args={[0.026, 8, 8]} />
            </mesh>
            <mesh position={[0.055, 0.72, 0.13]} material={mat.eye}>
              <sphereGeometry args={[0.026, 8, 8]} />
            </mesh>

            {/* Left Arm with Elbow joint */}
            <group ref={armL} position={[-0.32, 0.50, 0]}>
              <mesh position={[0, -0.14, 0]} material={mat.shirt} castShadow>
                <boxGeometry args={[0.12, 0.28, 0.12]} />
              </mesh>
              <group ref={forearmL} position={[0, -0.28, 0]}>
                <mesh position={[0, -0.12, 0]} material={mat.skin}>
                  <boxGeometry args={[0.10, 0.24, 0.10]} />
                </mesh>
                <mesh position={[0, -0.26, 0.01]} material={mat.skin}>
                  <boxGeometry args={[0.09, 0.08, 0.10]} />
                </mesh>
              </group>
            </group>

            {/* Right Arm with Elbow joint */}
            <group ref={armR} position={[0.32, 0.50, 0]}>
              <mesh position={[0, -0.14, 0]} material={mat.shirt} castShadow>
                <boxGeometry args={[0.12, 0.28, 0.12]} />
              </mesh>
              <group ref={forearmR} position={[0, -0.28, 0]}>
                <mesh position={[0, -0.12, 0]} material={mat.skin}>
                  <boxGeometry args={[0.10, 0.24, 0.10]} />
                </mesh>
                <mesh position={[0, -0.26, 0.01]} material={mat.skin}>
                  <boxGeometry args={[0.09, 0.08, 0.10]} />
                </mesh>
              </group>
            </group>
          </group>

          {/* Left Leg with Knee joint */}
          <group ref={legL} position={[-0.12, 0.88, 0]}>
            <mesh position={[0, -0.20, 0]} material={mat.pants} castShadow>
              <boxGeometry args={[0.15, 0.40, 0.16]} />
            </mesh>
            <group ref={kneeL} position={[0, -0.40, 0]}>
              <mesh position={[0, -0.18, 0]} material={mat.pants} castShadow>
                <boxGeometry args={[0.13, 0.36, 0.14]} />
              </mesh>
              <mesh position={[0, -0.38, 0.04]} material={mat.shoe}>
                <boxGeometry args={[0.15, 0.10, 0.26]} />
              </mesh>
            </group>
          </group>

          {/* Right Leg with Knee joint */}
          <group ref={legR} position={[0.12, 0.88, 0]}>
            <mesh position={[0, -0.20, 0]} material={mat.pants} castShadow>
              <boxGeometry args={[0.15, 0.40, 0.16]} />
            </mesh>
            <group ref={kneeR} position={[0, -0.40, 0]}>
              <mesh position={[0, -0.18, 0]} material={mat.pants} castShadow>
                <boxGeometry args={[0.13, 0.36, 0.14]} />
              </mesh>
              <mesh position={[0, -0.38, 0.04]} material={mat.shoe}>
                <boxGeometry args={[0.15, 0.10, 0.26]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[SPAWN.x, 0.03, SPAWN.z]} material={mat.shadow}>
        <circleGeometry args={[0.42, 18]} />
      </mesh>
    </group>
  );
}
