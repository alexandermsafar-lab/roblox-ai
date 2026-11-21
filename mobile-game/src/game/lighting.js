import * as THREE from 'three';

// Lights, fog and renderer look. Game.js calls createLighting() once and
// lighting.update(focusX, focusZ) every frame with the squad position.
export function createLighting(scene, renderer) {
  scene.fog = new THREE.Fog(0xd4e9f8, 50, 150);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x6b7a90, 1.25));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(6, 12, 8);
  scene.add(sun);
  scene.add(sun.target);
  return {
    sun,
    update(focusX, focusZ) {
      sun.position.set(focusX + 6, 12, focusZ + 8);
      sun.target.position.set(focusX, 0, focusZ);
    },
  };
}
