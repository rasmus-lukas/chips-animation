import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { AnimationMixer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export default function ChipAnimationScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();

    // Temporary fallback camera
    let camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
      20,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(7, 4, 5);
    camera.lookAt(0, 1.3, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);

    if (mountRef.current && mountRef.current.children.length === 0) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // Lights
    const positions: [number, number, number][] = [
      [5, 5, 5],
      [-5, 5, 5],
      [0, 5, -5],
    ];
    positions.forEach((pos) => {
      const l = new THREE.DirectionalLight(new THREE.Color("rgb(255,255,255)"), 100);
      l.position.set(...pos);
      l.castShadow = true;
      l.shadow.mapSize.width = 2048;
      l.shadow.mapSize.height = 2048;
      scene.add(l);
    });
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // Animation mixer
    let mixer: AnimationMixer | null = null;

    // HDR Environment
    new RGBELoader().load("/hdr_environment.hdr", (hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = hdr;
      scene.background = null;
    });

    // Post-processing: Bloom
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      0.3, // strength
      0.4, // radius
      0.05 // threshold
    );
    composer.addPass(bloomPass);

    // Load GLB
    const loader = new GLTFLoader();
    loader.load("/chipAnimation.glb", (gltf) => {
      const root = gltf.scene;

      // Frosted glass material & hide floor
      root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.name.toLowerCase().includes("plane")) {
            mesh.visible = false;
            return;
          }
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: 0x222222,
            metalness: 1,
            roughness: 0.1,
            transparent: true,
            opacity: 1,
            transmission: 1,
            thickness: 2.5,
            ior: 1.45,
            specularIntensity: 10,
            clearcoat: 0.15,
            clearcoatRoughness: 0,
            side: THREE.DoubleSide,
          });
        }
      });

      scene.add(root);

      // Use exported camera if available
      const exportedCamera = gltf.cameras?.[0];
      if (exportedCamera) {
        camera = exportedCamera;
        renderPass.camera = camera; // ✅ update RenderPass
      }

      // Animation setup
      if (gltf.animations.length > 0) {
        mixer = new AnimationMixer(root);
        const action = mixer.clipAction(gltf.animations[0]);
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = true;
        action.enabled = true;

        mountRef.current?.addEventListener("mouseenter", () => {
          action.stop();
          action.reset();
          action.play();
        });
      }
    });

    // Resize
    const handleResize = () => {
      const width = mountRef.current!.clientWidth;
      const height = mountRef.current!.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop
    const clock = new THREE.Clock();
    const tick = () => {
      requestAnimationFrame(tick);
      if (mixer) mixer.update(clock.getDelta());
      composer.render();
    };
    tick();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: "300px",
        height: "400px",
        display: "block",
        background: "transparent",
      }}
    />
  );
}
