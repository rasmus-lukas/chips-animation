import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default function PokerScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // === Setup basic scene ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);

    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(3, 3, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);

    // Controls (optional)
    const controls = new OrbitControls(camera, renderer.domElement);

    // === Lighting ===
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(3, 5, 3);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // === Poker chip geometry ===
    const chipGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
    const chipMaterial = new THREE.MeshStandardMaterial({ color: "#d32f2f" });

    // Create stack
    const stack: THREE.Mesh[] = [];
    const stackHeight = 4;

    for (let i = 0; i < stackHeight; i++) {
      const chip = new THREE.Mesh(chipGeometry, chipMaterial);
      chip.position.y = i * 0.22;
      scene.add(chip);
      stack.push(chip);
    }

    // Leaning chip
    const leaningChip = new THREE.Mesh(chipGeometry, new THREE.MeshStandardMaterial({ color: "#0091ea" }));
    leaningChip.position.set(2, 0.22 * 4, 6); // lean on mid-height
    leaningChip.rotation.z = 15;
    scene.add(leaningChip);

    // Hover detection via Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isHovering = false;
    let animProgress = 0;

    const stackGroup = new THREE.Group();
    stack.forEach(chip => stackGroup.add(chip));
    scene.add(stackGroup);

    // For animation path
    const radius = 1.3;
    const baseY = leaningChip.position.y;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(stack);

      isHovering = intersects.length > 0;
    };

    renderer.domElement.addEventListener("mousemove", handleMouseMove);

    // === Animation Loop ===
    const animate = () => {
      requestAnimationFrame(animate);

      // Animate leaning chip rolling around the stack
      if (isHovering) {
        animProgress = Math.min(animProgress + 0.02, 1);
      } else {
        animProgress = Math.max(animProgress - 0.02, 0);
      }

      // Map animProgress (0 → 1 → 0) to angle (0 → 2π → 0)
      const angle = animProgress * Math.PI * 2;

      leaningChip.position.x = Math.cos(angle) * radius;
      leaningChip.position.z = Math.sin(angle) * radius;
      leaningChip.position.y = baseY;

      // Make chip tilt naturally while rolling
      leaningChip.rotation.y = angle + Math.PI / 2;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: "100vw", height: "100vh", display: "block" }}
    />
  );
}
