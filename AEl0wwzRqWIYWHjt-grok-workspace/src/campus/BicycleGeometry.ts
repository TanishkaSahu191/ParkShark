import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

function createCylinderBetweenPoints(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  radialSegments = 5
): THREE.BufferGeometry {
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();
  const geo = new THREE.CylinderGeometry(radius, radius, length, radialSegments);

  const orientation = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const dirNormalized = direction.clone().normalize();

  if (Math.abs(up.dot(dirNormalized)) > 0.999) {
    orientation.lookAt(p1, p2, new THREE.Vector3(0, 0, 1));
  } else {
    const axis = new THREE.Vector3().crossVectors(up, dirNormalized).normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(dirNormalized))));
    orientation.makeRotationAxis(axis, angle);
  }

  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  geo.applyMatrix4(orientation);
  geo.translate(mid.x, mid.y, mid.z);
  return geo;
}

export function createLowPolyBicycleGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Wheel 1: Front wheel (torus)
  const frontWheelGeo = new THREE.TorusGeometry(0.28, 0.024, 4, 10);
  frontWheelGeo.rotateY(Math.PI / 2);
  frontWheelGeo.translate(0, 0.28, 0.45);
  parts.push(frontWheelGeo);

  // Wheel 2: Rear wheel (torus)
  const rearWheelGeo = new THREE.TorusGeometry(0.28, 0.024, 4, 10);
  rearWheelGeo.rotateY(Math.PI / 2);
  rearWheelGeo.translate(0, 0.28, -0.45);
  parts.push(rearWheelGeo);

  // Key Frame Nodes
  const frontAxle = new THREE.Vector3(0, 0.28, 0.45);
  const rearAxle = new THREE.Vector3(0, 0.28, -0.45);
  const bb = new THREE.Vector3(0, 0.28, 0.0);
  const seatNode = new THREE.Vector3(0, 0.68, -0.16);
  const headNode = new THREE.Vector3(0, 0.76, 0.32);

  const tubeRadius = 0.02;

  // Frame tubes:
  // 1. Down tube (BB to Head)
  parts.push(createCylinderBetweenPoints(bb, headNode, tubeRadius));
  // 2. Top tube (Seat to Head)
  parts.push(createCylinderBetweenPoints(seatNode, headNode, tubeRadius));
  // 3. Seat tube (BB to Seat)
  parts.push(createCylinderBetweenPoints(bb, seatNode, tubeRadius));
  // 4. Chain stays (BB to Rear Axle)
  parts.push(createCylinderBetweenPoints(bb, rearAxle, tubeRadius * 0.8));
  // 5. Seat stays (Seat to Rear Axle)
  parts.push(createCylinderBetweenPoints(seatNode, rearAxle, tubeRadius * 0.8));
  // 6. Fork (Head to Front Axle)
  parts.push(createCylinderBetweenPoints(headNode, frontAxle, tubeRadius * 0.9));

  // Handlebars (horizontal bar across X axis)
  const handleGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.40, 5);
  handleGeo.rotateZ(Math.PI / 2);
  handleGeo.translate(0, 0.82, 0.32);
  parts.push(handleGeo);

  // Stem (connecting Head to Handlebars)
  parts.push(createCylinderBetweenPoints(headNode, new THREE.Vector3(0, 0.82, 0.32), tubeRadius * 0.8));

  // Saddle (seat box)
  const saddleGeo = new THREE.BoxGeometry(0.12, 0.04, 0.20);
  saddleGeo.translate(0, 0.71, -0.16);
  parts.push(saddleGeo);

  // Merge into single lightweight instanced geometry
  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();

  // Dispose individual parts
  for (const p of parts) {
    p.dispose();
  }

  return merged;
}

