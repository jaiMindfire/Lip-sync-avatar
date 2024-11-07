import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useGraph, useLoader } from "@react-three/fiber";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { useControls } from "leva";
import { FileLoader, MathUtils, Vector3 } from "three";

const corresponding = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_AA",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP",
};

export function Avatar(props) {
  const { scene } = useGLTF("/models/672b58413190e573b30a75f7.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);

  const { animations: idleAnimation } = useFBX("/animations/Idle.fbx");
  const { animations: waveAnimation } = useFBX("/animations/Waving.fbx");
  const { animations: walkAnimation } = useFBX("/animations/Rolling.fbx");
  const { animations: jumpAnimation } = useFBX("/animations/Jump.fbx");

  const { x, y, z } = props.pos;
  console.log(x, y, z);

  const {
    playAudio,
    script,
    headFollow,
    smoothMorphTarget,
    morphTargetSmoothing,
    jump,
  } = useControls({
    playAudio: false,
    headFollow: true,
    smoothMorphTarget: true,
    morphTargetSmoothing: 0.5,
    jump: false,
    script: {
      value: "welcome",
      options: ["welcome"],
    },
  });

  const audio = useMemo(() => new Audio(`/audios/${script}.wav`), [script]);
  const jsonFile = useLoader(FileLoader, `audios/${script}.json`);
  const lipsync = JSON.parse(jsonFile);

  idleAnimation[0].name = "Idle";
  waveAnimation[0].name = "Wave";
  jumpAnimation[0].name = "Jump";
  walkAnimation[0].name = "Walk";

  const [animation, setAnimation] = useState("Idle");
  const [isJumping, setIsJumping] = useState(false);

  const group = useRef();
  const { actions } = useAnimations(
    [idleAnimation[0], waveAnimation[0], jumpAnimation[0]],
    group
  );

  const hasAudioPlayed = useRef(false);

  useFrame((state, delta) => {
    actions.Walk?.reset().fadeIn(0.5).play();
    if (playAudio) {
      const currentAudioTime = audio.currentTime;
      if (audio.paused || audio.ended) return;

      Object.values(corresponding).forEach((value) => {
        if (!smoothMorphTarget) {
          nodes.Wolf3D_Head.morphTargetInfluences[
            nodes.Wolf3D_Head.morphTargetDictionary[value]
          ] = 0;
          nodes.Wolf3D_Teeth.morphTargetInfluences[
            nodes.Wolf3D_Teeth.morphTargetDictionary[value]
          ] = 0;
        } else {
          nodes.Wolf3D_Head.morphTargetInfluences[
            nodes.Wolf3D_Head.morphTargetDictionary[value]
          ] = MathUtils.lerp(
            nodes.Wolf3D_Head.morphTargetInfluences[
              nodes.Wolf3D_Head.morphTargetDictionary[value]
            ],
            0,
            morphTargetSmoothing
          );

          nodes.Wolf3D_Teeth.morphTargetInfluences[
            nodes.Wolf3D_Teeth.morphTargetDictionary[value]
          ] = MathUtils.lerp(
            nodes.Wolf3D_Teeth.morphTargetInfluences[
              nodes.Wolf3D_Teeth.morphTargetDictionary[value]
            ],
            0,
            morphTargetSmoothing
          );
        }
      });

      for (let i = 0; i < lipsync.mouthCues.length; i++) {
        const mouthCue = lipsync.mouthCues[i];
        if (
          currentAudioTime >= mouthCue.start &&
          currentAudioTime <= mouthCue.end
        ) {
          if (!smoothMorphTarget) {
            nodes.Wolf3D_Head.morphTargetInfluences[
              nodes.Wolf3D_Head.morphTargetDictionary[
                corresponding[mouthCue.value]
              ]
            ] = 1;
            nodes.Wolf3D_Teeth.morphTargetInfluences[
              nodes.Wolf3D_Teeth.morphTargetDictionary[
                corresponding[mouthCue.value]
              ]
            ] = 1;
          } else {
            nodes.Wolf3D_Head.morphTargetInfluences[
              nodes.Wolf3D_Head.morphTargetDictionary[
                corresponding[mouthCue.value]
              ]
            ] = MathUtils.lerp(
              nodes.Wolf3D_Head.morphTargetInfluences[
                nodes.Wolf3D_Head.morphTargetDictionary[
                  corresponding[mouthCue.value]
                ]
              ],
              1,
              morphTargetSmoothing
            );
            nodes.Wolf3D_Teeth.morphTargetInfluences[
              nodes.Wolf3D_Teeth.morphTargetDictionary[
                corresponding[mouthCue.value]
              ]
            ] = MathUtils.lerp(
              nodes.Wolf3D_Teeth.morphTargetInfluences[
                nodes.Wolf3D_Teeth.morphTargetDictionary[
                  corresponding[mouthCue.value]
                ]
              ],
              1,
              morphTargetSmoothing
            );
          }

          break;
        }
      }
    }
    if (props.pos.x !== null && props.pos.z !== null && props.move && group.current) {
      // Calculate distance between current and target positions
      const targetPosition = new Vector3(
        props.pos.x,
        group.current.position.y,
        props.pos.z
      );
      const distance = group.current.position.distanceTo(targetPosition);
      console.log(distance, "disst");
      if (distance > 0.1) {
        // Move towards the target position
        const direction = targetPosition
          .clone()
          .sub(group.current.position)
          .normalize();
        group.current.position.add(direction.multiplyScalar(0.05)); // Adjust speed as needed

        // Rotate character to face the movement direction
        group.current.lookAt(targetPosition);

        // Play walk animation
        actions.Idle?.fadeOut(0.5);
        actions.Walk?.reset().fadeIn(0.5).play();
      } else {
        // Stop movement and switch to idle animation
        actions.Walk?.fadeOut(0.5);
        actions.Idle?.reset().fadeIn(0.5).play();
        props.setMove(false); // Stop moving once at target
      }
    }
  });

  useEffect(() => {
    actions.Idle?.reset().fadeIn(0.5).play(); // Start Idle in a loop on mount
  }, [actions]);

  useEffect(() => {
    if (jump) {
      setIsJumping(true);
      actions.Idle?.fadeOut(0.5);
      actions.Wave?.fadeOut(0.5);
      actions.Jump?.reset().fadeIn(0.5).play();
    }
  }, [jump, actions, isJumping]);

  const handleAudioEnded = () => {
    setAnimation("Idle");
    actions.Wave?.fadeOut(0.5);
    actions.Idle?.reset().fadeIn(0.5).play();
    hasAudioPlayed.current = false;
  };

  useEffect(() => {
    audio.addEventListener("ended", handleAudioEnded);

    if (playAudio && !hasAudioPlayed.current) {
      actions.Idle?.fadeOut(0.5);
      actions.Wave?.fadeIn(0.5).play();
      audio.play();
      hasAudioPlayed.current = true;
    } else if (!playAudio) {
      audio.pause();
      handleAudioEnded();
    }

    return () => {
      audio.removeEventListener("ended", handleAudioEnded);
    };
  }, [playAudio, script, audio, actions]);

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

useGLTF.preload("/models/672b58413190e573b30a75f7.glb");
useFBX.preload("/animations/Idle.fbx");
useFBX.preload("/animations/Waving.fbx");
useFBX.preload("/animations/Jumping.fbx");
useFBX.preload("/animations/Walking.fbx");
