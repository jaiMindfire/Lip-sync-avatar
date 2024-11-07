import {
  CameraControls,
  Environment,
  Gltf,
  OrbitControls,
  useCursor,
  useTexture,
} from "@react-three/drei";
import { Avatar } from "./Avatar";
import { Canvas, useThree } from "@react-three/fiber";
import { Camera } from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { useState } from "react";

export const Experience = () => {
  const [pos, setPos] = useState({
    x: null,
    y: null,
    z: null,
  });

  const [move, setMove] = useState(false);

  const [onFloor, setOnFloor] = useState(false);

  return (
    <>
      <Canvas shadows camera={{ position: [0, 0, 0.001] }}>
        <CameraManager />
        <Environment preset="sunset" />
        <ambientLight color="pink" />
        <Avatar
          position={[0, -1.75, -4]}
          rotation-x={degToRad(0)}
          scale={1.6}
          pos={pos}
          move={move}
          setMove={setMove}
        />
        <Gltf
          src="/models/classroom_default.glb"
          position={[0.3, -1.7, -1]}
          onClick={(e) => {
            setPos({ x: e.point.x, y: 0, z: e.point.z });
            setMove(true);
          }}
        />
      </Canvas>
    </>
  );
};

const CameraManager = () => {
  return <CameraControls minZoom={1} maxZoom={3} />;
};
