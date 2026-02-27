import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { buildTree } from '../utils/treeGen';

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────
// Copied locally so garden/badge placement is deterministic without importing
// from treeGen (which keeps it internal).

function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Time-of-day config ───────────────────────────────────────────────────────
// All colors as 0xRRGGBB ints. Keyframes interpolated by hour (0–24).

const TIME_KEYS = [
  //  h    sky(bg)  horizon(fog) skyHemi  groundHemi  ambI  sunCol  sunI
  [  0,  0x060c1a, 0x12182e, 0x1a2245, 0x0a0e18, 0.12, 0xc8d8ff, 0.08 ],
  [  5,  0x1c0e32, 0x3a1545, 0x251540, 0x120a20, 0.18, 0xffbb88, 0.14 ],
  [  6,  0x3d1f60, 0xe07850, 0x4a2850, 0x2a1010, 0.28, 0xffcc80, 0.52 ],
  [  7,  0x4e8ecc, 0xe8cc90, 0xc0b890, 0x3d2b1f, 0.45, 0xfff0c0, 0.82 ],
  [ 10,  0x2278cc, 0x98daf5, 0xa8ccee, 0x3d2b1f, 0.55, 0xfffff5, 0.95 ],
  [ 13,  0x1870c8, 0x88d0f0, 0xa0c8e8, 0x3d2b1f, 0.60, 0xffffff, 1.00 ],
  [ 17,  0x2a68b8, 0xa0c8e8, 0xa8c8e0, 0x3d2b1f, 0.55, 0xfff8d0, 0.85 ],
  [ 19,  0x2a1858, 0xe07040, 0x4a2840, 0x1a0808, 0.30, 0xff9940, 0.50 ],
  [ 20,  0x100c28, 0x1c1438, 0x181630, 0x080610, 0.16, 0xffd880, 0.16 ],
  [ 24,  0x060c1a, 0x12182e, 0x1a2245, 0x0a0e18, 0.12, 0xc8d8ff, 0.08 ],
];

function getTimeOfDayConfig(overrideHour) {
  const now = new Date();
  const hour = overrideHour != null ? overrideHour % 24 : now.getHours() + now.getMinutes() / 60;

  let a = TIME_KEYS[0], b = TIME_KEYS[1];
  for (let i = 0; i < TIME_KEYS.length - 1; i++) {
    if (hour >= TIME_KEYS[i][0] && hour < TIME_KEYS[i + 1][0]) {
      a = TIME_KEYS[i]; b = TIME_KEYS[i + 1]; break;
    }
  }
  const t = b[0] === a[0] ? 0 : (hour - a[0]) / (b[0] - a[0]);
  const lc = (i) => new THREE.Color(a[i]).lerp(new THREE.Color(b[i]), t);
  const lf = (i) => a[i] + (b[i] - a[i]) * t;

  const isNight = hour < 6 || hour >= 19.5;
  const R = 11;
  let bodyPos;
  if (!isNight) {
    const ang = Math.max(0, Math.min(1, (hour - 6) / 13)) * Math.PI;
    bodyPos = new THREE.Vector3(-Math.cos(ang) * R, Math.sin(ang) * R * 0.9, -1.5);
  } else {
    const mh = hour >= 19.5 ? hour - 19.5 : hour + 4.5;
    const ang = Math.max(0, Math.min(1, mh / 10)) * Math.PI;
    bodyPos = new THREE.Vector3(-Math.cos(ang) * R, Math.sin(ang) * R * 0.75, -1.5);
  }

  return {
    bgColor:          lc(1),
    fogColor:         lc(2),
    skyHemi:          lc(3),
    groundHemi:       lc(4),
    ambientIntensity: lf(5),
    sunColor:         lc(6),
    sunIntensity:     lf(7),
    bodyPos,
    isNight,
  };
}

// ── Celestial body (sun or moon) ─────────────────────────────────────────────

function buildCelestialBody(isNight, bodyPos) {
  const size  = isNight ? 0.28 : 0.48;
  const color = isNight ? 0xfff8f0 : 0xffffc0;
  const mesh  = new THREE.Mesh(
    new THREE.SphereGeometry(size, 12, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  mesh.position.copy(bodyPos);
  return mesh;
}

// ── Apply sky config to live scene ───────────────────────────────────────────

function applySkyToScene(sky, scene, renderer, celestialRef, hemiRef, sunLightRef, fillRef) {
  renderer.setClearColor(sky.bgColor, 1);
  scene.fog.color.copy(sky.fogColor);

  if (celestialRef.current) scene.remove(celestialRef.current);
  const body = buildCelestialBody(sky.isNight, sky.bodyPos);
  celestialRef.current = body;
  scene.add(body);

  hemiRef.current.color.copy(sky.skyHemi);
  hemiRef.current.groundColor.copy(sky.groundHemi);
  hemiRef.current.intensity = sky.ambientIntensity;

  sunLightRef.current.color.copy(sky.sunColor);
  sunLightRef.current.intensity = sky.sunIntensity;
  sunLightRef.current.position.copy(sky.bodyPos);

  fillRef.current.color.copy(sky.skyHemi);
  fillRef.current.intensity = sky.sunIntensity * 0.15;
  fillRef.current.position.set(-sky.bodyPos.x * 0.5, 2, -sky.bodyPos.z);
}

// ── Camera framing ───────────────────────────────────────────────────────────

function frameCameraToTree(camera, tree) {
  try {
    const box = new THREE.Box3().setFromObject(tree);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const dist   = Math.max(2.5, maxDim * 1.6);
    const camY   = center.y + size.y * 0.1;
    const lookY  = center.y * 0.8;

    camera.position.set(0, camY, dist);
    camera.lookAt(0, lookY, 0);
    camera.userData.dist  = dist;
    camera.userData.camY  = camY;
    camera.userData.lookY = lookY;
  } catch (e) {
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1, 0);
    camera.userData.dist  = 5;
    camera.userData.camY  = 2;
    camera.userData.lookY = 1;
  }
}

// ── Ground plane ──────────────────────────────────────────────────────────────
// Sits just below the treeGen soil circle (y = -0.01) at y = -0.02.
// Fog (9–20 units) hides the hard edge.

const _GROUND_NIGHT = new THREE.Color(0x0a1408);
const _GROUND_DAY   = new THREE.Color(0x2a5a14);

function buildGround() {
  const geo  = new THREE.PlaneGeometry(60, 60, 1, 1);
  const mat  = new THREE.MeshLambertMaterial({ color: _GROUND_DAY.clone() });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;
  return mesh;
}

function updateGroundColor(ground, sky) {
  // Remap ambientIntensity (0.12 night → 0.60 full day) to 0–1
  const t = Math.max(0, Math.min(1, (sky.ambientIntensity - 0.12) / 0.44));
  ground.material.color.copy(_GROUND_NIGHT).lerp(_GROUND_DAY, t);
}

// ── Garden foliage ────────────────────────────────────────────────────────────
// Grows with totalMinutes in 4 thresholds (30 / 120 / 300 / 600 minutes).
// dayStreak drives foliage color vibrancy.
// Deterministic layout via seeded PRNG — same minutes level → same garden.

const _GRASS_COUNTS  = [0, 10, 22, 36, 54];
const _FLOWER_COUNTS = [0,  0,  6, 12, 20];
const _SHRUB_COUNTS  = [0,  0,  0,  2,  5];

function buildGarden(totalMinutes, dayStreak) {
  const rand  = mulberry32(0xc0ffee);
  const group = new THREE.Group();

  const level = totalMinutes >= 600 ? 4
              : totalMinutes >= 300 ? 3
              : totalMinutes >= 120 ? 2
              : totalMinutes >= 30  ? 1 : 0;

  if (level === 0) return group;

  const vibrancy = Math.min(1, (dayStreak || 0) / 30);
  const grassMat = new THREE.MeshLambertMaterial({
    color: new THREE.Color(0.08, 0.22 + vibrancy * 0.18, 0.04),
    side: THREE.DoubleSide,
  });
  const stemMat = new THREE.MeshLambertMaterial({ color: 0x2a5a10 });
  const bladeGeo = new THREE.ConeGeometry(0.025, 0.2, 3);

  // ── Grass tufts ──
  for (let i = 0; i < _GRASS_COUNTS[level]; i++) {
    const angle = rand() * Math.PI * 2;
    const r     = 0.5 + rand() * 2.8;
    const tuft  = new THREE.Group();
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, grassMat);
      blade.position.set((rand() - 0.5) * 0.09, 0.1, (rand() - 0.5) * 0.09);
      blade.rotation.set((rand() - 0.5) * 0.5, rand() * Math.PI * 2, 0);
      tuft.add(blade);
    }
    tuft.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    group.add(tuft);
  }

  // ── Wildflowers (level 2+) ──
  if (level >= 2) {
    const bloomGeo = new THREE.SphereGeometry(0.065, 4, 3);
    const stemGeo  = new THREE.CylinderGeometry(0.012, 0.015, 0.28, 4);

    for (let i = 0; i < _FLOWER_COUNTS[level]; i++) {
      const angle = rand() * Math.PI * 2;
      const r     = 0.6 + rand() * 2.2;
      const fg    = new THREE.Group();

      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.14;
      fg.add(stem);

      const h       = rand();
      const pcol    = h < 0.33 ? 0xffaacc : h < 0.66 ? 0xffdd77 : 0x88ccff;
      const bloom   = new THREE.Mesh(bloomGeo, new THREE.MeshLambertMaterial({ color: pcol }));
      bloom.scale.y = 0.5;
      bloom.position.y = 0.3;
      fg.add(bloom);

      fg.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      group.add(fg);
    }
  }

  // ── Shrubs (level 3+) ──
  if (level >= 3) {
    const shrubMat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(0.07, 0.18 + vibrancy * 0.12, 0.03),
    });
    const bodyGeo = new THREE.SphereGeometry(0.3, 5, 4);
    const lobeGeo = new THREE.SphereGeometry(0.2, 5, 4);

    for (let i = 0; i < _SHRUB_COUNTS[level]; i++) {
      const angle = (i / _SHRUB_COUNTS[level]) * Math.PI * 2 + rand() * 0.6;
      const r     = 1.6 + rand() * 0.8;
      const sg    = new THREE.Group();

      const body = new THREE.Mesh(bodyGeo, shrubMat);
      body.scale.y = 0.65;
      body.position.y = 0.2;
      sg.add(body);

      const lobe = new THREE.Mesh(lobeGeo, shrubMat);
      lobe.scale.y = 0.6;
      lobe.position.set((rand() - 0.5) * 0.25, 0.28, (rand() - 0.5) * 0.25);
      sg.add(lobe);

      sg.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      group.add(sg);
    }
  }

  return group;
}

// ── Khatm badge stones ────────────────────────────────────────────────────────
// One small stone stele per completed khatm, placed in a circle around the tree.
// Every 5th stone gets a gold-accented emissive material.

function buildBadgeMarkers(khatms) {
  const rand  = mulberry32(0xba06e5);
  const group = new THREE.Group();
  const count = Math.min(khatms || 0, 12);

  for (let i = 0; i < count; i++) {
    const angle     = (i / count) * Math.PI * 2;
    const r         = 1.9 + (i % 2) * 0.3;
    const isSpecial = i % 5 === 0;
    const height    = 0.15 + (i % 3) * 0.07;

    const mat = new THREE.MeshPhongMaterial({
      color: isSpecial
        ? new THREE.Color(0.55, 0.45, 0.14)
        : new THREE.Color(0.40, 0.36, 0.30),
      emissive: isSpecial
        ? new THREE.Color(0.14, 0.09, 0.01)
        : new THREE.Color(0.02, 0.02, 0.01),
      flatShading: true,
    });

    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.09, height, 0.065), mat);
    stone.position.set(Math.cos(angle) * r, height / 2, Math.sin(angle) * r);
    stone.rotation.y = angle + Math.PI / 2;
    stone.rotation.z = (rand() - 0.5) * 0.12; // slight weathered lean
    group.add(stone);
  }

  return group;
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function buildStars(count = 160) {
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);
  const phases    = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(1 - Math.random() * 0.92);
    const r     = 16 + Math.random() * 3;
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const b = 0.6 + Math.random() * 0.4;
    colors[i * 3]     = b;
    colors[i * 3 + 1] = b;
    colors[i * 3 + 2] = Math.min(1, b + 0.08);
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  geo.userData.phases = phases;

  return new THREE.Points(geo, new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.09,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1.0,
  }));
}

// ── Fireflies ─────────────────────────────────────────────────────────────────

function buildFireflies(count = 20) {
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 3);
  const data      = [];

  for (let i = 0; i < count; i++) {
    const angle  = Math.random() * Math.PI * 2;
    const radius = 0.5 + Math.random() * 2.0;
    const bx     = Math.cos(angle) * radius;
    const by     = 0.2 + Math.random() * 3.5;
    const bz     = Math.sin(angle) * radius;
    const phase  = Math.random() * Math.PI * 2;
    const speed  = 0.3 + Math.random() * 0.7;
    data.push({
      bx, by, bz,
      px: phase,
      py: phase + 1.1,
      pz: phase + 2.3,
      speed,
      blinkPhase: Math.random() * Math.PI * 2,
    });
    positions[i * 3]     = bx;
    positions[i * 3 + 1] = by;
    positions[i * 3 + 2] = bz;
    colors[i * 3]     = 0.6;
    colors[i * 3 + 1] = 1.0;
    colors[i * 3 + 2] = 0.3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  return {
    points: new THREE.Points(geo, new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.14,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.0,
    })),
    data,
  };
}

// ── Firefly point lights ──────────────────────────────────────────────────────
// A subset of fireflies get real PointLights so they illuminate nearby geometry.
// Intensity is zeroed when the firefly blinks off, so there's no background glow.

const FF_LIGHT_COUNT = 6;

function buildFireflyLights() {
  const lights = [];
  for (let i = 0; i < FF_LIGHT_COUNT; i++) {
    // color, intensity, distance, decay
    lights.push(new THREE.PointLight(0x88ff55, 0.0, 2.4, 2));
  }
  return lights;
}

// ── Component ────────────────────────────────────────────────────────────────

const FRAME_INTERVAL = 1000 / 30;

export default function TreeScene({ state, overrideGrowth, timeOverride }) {
  const rafRef         = useRef(null);
  const sceneRef       = useRef(null);
  const cameraRef      = useRef(null);
  const rendererRef    = useRef(null);
  const treeRef        = useRef(null);
  const timeRef        = useRef(0);
  const celestialRef   = useRef(null);
  const hemiRef        = useRef(null);
  const sunLightRef    = useRef(null);
  const fillRef        = useRef(null);
  const groundRef      = useRef(null);
  const gardenRef      = useRef(null);
  const badgesRef      = useRef(null);
  const starsRef       = useRef(null);
  const firefliesRef   = useRef(null);
  const fireflyDataRef = useRef(null);
  const ffLightsRef    = useRef(null);

  const { width: windowWidth } = useWindowDimensions();
  const canvasSize = Math.min(windowWidth - 40, 350);

  const memoSig = (state.memo && Object.keys(state.memo).length > 0)
    ? Object.keys(state.memo).map(k => {
        const e = state.memo[k];
        return `${k}:${(e && e.versesMemorized && e.versesMemorized.length) || 0}:${(e && e.status) || ''}`;
      }).join(',')
    : '';

  const stateKey = overrideGrowth
    ? JSON.stringify(overrideGrowth)
    : `${state.totalPages}-${state.khatms}-${state.totalMinutes}-${state.dayStreak}-${memoSig}`;

  const stateRef = useRef({ state, overrideGrowth });
  stateRef.current = { state, overrideGrowth };

  function onContextCreate(gl) {
    try {
      const sky = getTimeOfDayConfig(timeOverride);

      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(sky.bgColor, 1);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(sky.fogColor, 9, 20);
      sceneRef.current = scene;

      const aspect = gl.drawingBufferWidth / Math.max(gl.drawingBufferHeight, 1);
      const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50);
      cameraRef.current = camera;

      // Hemisphere light
      const hemi = new THREE.HemisphereLight(sky.skyHemi, sky.groundHemi, sky.ambientIntensity);
      hemiRef.current = hemi;
      scene.add(hemi);

      // Sun / moon directional light
      const sunLight = new THREE.DirectionalLight(sky.sunColor, sky.sunIntensity);
      sunLight.position.copy(sky.bodyPos);
      sunLightRef.current = sunLight;
      scene.add(sunLight);

      // Subtle fill from opposite side
      const fill = new THREE.DirectionalLight(sky.skyHemi, sky.sunIntensity * 0.15);
      fill.position.set(-sky.bodyPos.x * 0.5, 2, -sky.bodyPos.z);
      fillRef.current = fill;
      scene.add(fill);

      // Celestial body mesh
      const body = buildCelestialBody(sky.isNight, sky.bodyPos);
      celestialRef.current = body;
      scene.add(body);

      // Ground plane — large enough that fog swallows the edge
      const ground = buildGround();
      updateGroundColor(ground, sky);
      groundRef.current = ground;
      scene.add(ground);

      // Garden & badge markers
      const { state: s } = stateRef.current;

      const garden = buildGarden(s.totalMinutes, s.dayStreak);
      gardenRef.current = garden;
      scene.add(garden);

      const badges = buildBadgeMarkers(s.khatms);
      badgesRef.current = badges;
      scene.add(badges);

      // Night elements: stars + fireflies + firefly point lights
      if (sky.isNight) {
        const stars = buildStars();
        starsRef.current = stars;
        scene.add(stars);

        const ff = buildFireflies();
        firefliesRef.current = ff.points;
        fireflyDataRef.current = ff.data;
        scene.add(ff.points);

        const ffLights = buildFireflyLights();
        ffLightsRef.current = ffLights;
        ffLights.forEach(l => scene.add(l));
      }

      // Tree (added last so it renders over ground)
      const { overrideGrowth: og } = stateRef.current;
      const tree = buildTree(s, og);
      treeRef.current = tree;
      scene.add(tree);
      frameCameraToTree(camera, tree);

      // ── Render loop (capped at 30 fps) ──
      let lastRender = 0;
      const loop = (ts) => {
        rafRef.current = requestAnimationFrame(loop);
        if (ts - lastRender < FRAME_INTERVAL) return;
        lastRender = ts;

        timeRef.current += 0.008;
        const t = timeRef.current;

        if (treeRef.current) {
          treeRef.current.rotation.z = Math.sin(t) * 0.01;
          treeRef.current.rotation.x = Math.cos(t * 0.7) * 0.005;
        }
        if (cameraRef.current) {
          const angle = t * 0.08;
          const d     = cameraRef.current.userData.dist || 5;
          cameraRef.current.position.x = Math.sin(angle) * d;
          cameraRef.current.position.z = Math.cos(angle) * d;
          cameraRef.current.position.y = cameraRef.current.userData.camY || 2;
          cameraRef.current.lookAt(0, cameraRef.current.userData.lookY || 1, 0);
        }

        // Stars — independent per-star twinkling
        if (starsRef.current) {
          const col    = starsRef.current.geometry.attributes.color;
          const phases = starsRef.current.geometry.userData.phases;
          for (let i = 0; i < phases.length; i++) {
            const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.9 + phases[i]));
            col.array[i * 3]     = tw;
            col.array[i * 3 + 1] = tw;
            col.array[i * 3 + 2] = Math.min(1, tw + 0.08);
          }
          col.needsUpdate = true;
        }

        // Fireflies — drift + blink; first FF_LIGHT_COUNT drive real PointLights
        if (firefliesRef.current && fireflyDataRef.current) {
          const pos  = firefliesRef.current.geometry.attributes.position;
          const col  = firefliesRef.current.geometry.attributes.color;
          const data = fireflyDataRef.current;
          for (let i = 0; i < data.length; i++) {
            const d = data[i];
            const px = d.bx + Math.sin(t * d.speed + d.px) * 0.45;
            const py = d.by + Math.sin(t * d.speed * 0.6 + d.py) * 0.28;
            const pz = d.bz + Math.sin(t * d.speed * 0.4 + d.pz) * 0.45;
            pos.array[i * 3]     = px;
            pos.array[i * 3 + 1] = py;
            pos.array[i * 3 + 2] = pz;
            const blink = Math.max(0, Math.sin(t * 1.8 * d.speed + d.blinkPhase));
            col.array[i * 3]     = 0.6 * blink;
            col.array[i * 3 + 1] = 1.0 * blink;
            col.array[i * 3 + 2] = 0.3 * blink;

            // Sync point light position and intensity with this firefly's blink
            if (ffLightsRef.current && i < FF_LIGHT_COUNT) {
              ffLightsRef.current[i].position.set(px, py, pz);
              ffLightsRef.current[i].intensity = 0.45 * blink;
            }
          }
          pos.needsUpdate = true;
          col.needsUpdate = true;
        }

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      requestAnimationFrame(loop);
    } catch (err) {
      console.error('[TreeScene] init error:', err);
    }
  }

  // Rebuild tree, garden, badges when engagement state changes
  useEffect(() => {
    if (!sceneRef.current || !treeRef.current) return;
    try {
      const scene = sceneRef.current;

      scene.remove(treeRef.current);
      const newTree = buildTree(state, overrideGrowth);
      treeRef.current = newTree;
      scene.add(newTree);
      if (cameraRef.current) frameCameraToTree(cameraRef.current, newTree);

      if (gardenRef.current) scene.remove(gardenRef.current);
      const garden = buildGarden(state.totalMinutes, state.dayStreak);
      gardenRef.current = garden;
      scene.add(garden);

      if (badgesRef.current) scene.remove(badgesRef.current);
      const badges = buildBadgeMarkers(state.khatms);
      badgesRef.current = badges;
      scene.add(badges);
    } catch (err) {
      console.error('[TreeScene] rebuild error:', err);
    }
  }, [stateKey]);

  // Update sky, ground color, and night elements when time changes
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !hemiRef.current) return;
    const sky   = getTimeOfDayConfig(timeOverride);
    const scene = sceneRef.current;

    applySkyToScene(sky, scene, rendererRef.current,
      celestialRef, hemiRef, sunLightRef, fillRef);

    if (groundRef.current) updateGroundColor(groundRef.current, sky);

    if (sky.isNight) {
      if (!starsRef.current) {
        const stars = buildStars();
        starsRef.current = stars;
        scene.add(stars);
      }
      if (!firefliesRef.current) {
        const ff = buildFireflies();
        firefliesRef.current = ff.points;
        fireflyDataRef.current = ff.data;
        scene.add(ff.points);
      }
      if (!ffLightsRef.current) {
        const lights = buildFireflyLights();
        ffLightsRef.current = lights;
        lights.forEach(l => scene.add(l));
      }
    } else {
      if (starsRef.current) {
        scene.remove(starsRef.current);
        starsRef.current = null;
      }
      if (firefliesRef.current) {
        scene.remove(firefliesRef.current);
        firefliesRef.current = null;
        fireflyDataRef.current = null;
      }
      if (ffLightsRef.current) {
        ffLightsRef.current.forEach(l => scene.remove(l));
        ffLightsRef.current = null;
      }
    }
  }, [timeOverride]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <View style={[styles.container, { width: canvasSize, height: canvasSize }]}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0a0e1a',
  },
  gl: {
    flex: 1,
  },
});
