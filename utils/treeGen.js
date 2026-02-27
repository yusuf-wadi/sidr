/**
 * Procedural tree generation — mathematical & continuous.
 *
 * Every page, every minute, every streak day changes the tree.
 * Uses seeded RNG so the same growth value always produces the
 * same tree shape (deterministic).
 *
 * Algorithm: queue-based recursive branching with cylindrical
 * BufferGeometry sections, proper tapering, gnarliness (organic
 * twist inversely proportional to radius), and upward growth bias.
 *
 * Growth inputs:
 *   totalPages   → trunk height, girth, branch depth/count
 *   totalMinutes → leaf density & size
 *   dayStreak    → color vibrancy (greener, richer bark)
 *   khatms       → blooms, golden bark accents
 *
 * Future: memorization → blossoms/fruit on branches
 */

import * as THREE from 'three';

// ── Seeded PRNG (mulberry32) ────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Growth parameters from engagement ───────────────────────────────────────

export function computeGrowth(state) {
  const { totalPages = 0, totalMinutes = 0, dayStreak = 0, khatms = 0, memo = {} } = state;

  const pageNorm = Math.min(totalPages / 604, 1);
  const minuteNorm = Math.min(totalMinutes / 600, 1);
  const streakNorm = Math.min(dayStreak / 30, 1);
  const khatmNorm = Math.min(khatms / 10, 1);

  // Single continuous factor 0→1
  const growth = pageNorm * 0.6 + khatmNorm * 0.4;

  // Memorization → fruit on the tree
  // Each active/complete surah produces a fruit at a branch tip
  const fruits = [];
  for (const [surahId, entry] of Object.entries(memo)) {
    if (!entry || entry.status === 'decayed') continue;
    // Support both old versesMemorized[] and new verseConfidence{} formats
    const goodCount = entry.verseConfidence
      ? Object.values(entry.verseConfidence).filter(c => c === 'good').length
      : (entry.versesMemorized ? entry.versesMemorized.length : 0);
    fruits.push({
      surahId: parseInt(surahId),
      progress: goodCount,
      status: entry.status,
    });
  }

  return {
    growth,

    // Trunk — grows taller AND much thicker
    trunkLength: 0.3 + growth * 2.2,
    trunkRadius: 0.02 + growth * 0.28,

    // Branching
    levels: growth * 4,
    childrenPerNode: 1.5 + growth * 2.5,
    branchAngle: 0.5 + growth * 0.3,
    lengthFalloff: 0.55 + growth * 0.1,
    radiusFalloff: 0.45 + growth * 0.1,
    taper: 0.6 + growth * 0.25,

    // Organic feel
    gnarliness: 0.03 + (1 - growth) * 0.04,
    twist: 0.15 + growth * 0.15,

    // Foliage
    leafDensity: minuteNorm * 0.7 + pageNorm * 0.3,
    leafSize: 0.06 + growth * 0.12,

    // Appearance
    vibrancy: 0.3 + streakNorm * 0.7,
    hasBloom: khatms >= 1,
    bloomIntensity: khatmNorm,

    // Memorization fruits
    fruits,

    // Seed for deterministic shape
    seed: Math.floor(totalPages * 0.1 + khatms * 1000),
  };
}

// ── Materials ───────────────────────────────────────────────────────────────

function makeBarkMaterial(vibrancy, bloomIntensity) {
  const base = new THREE.Color(0.3, 0.18, 0.08);
  if (bloomIntensity > 0) {
    base.lerp(new THREE.Color(0.4, 0.28, 0.08), bloomIntensity * 0.3);
  }
  base.lerp(new THREE.Color(0.35, 0.2, 0.1), vibrancy * 0.2);
  return new THREE.MeshPhongMaterial({ color: base, flatShading: true });
}

function makeLeafMaterial(vibrancy, hasBloom, bloomIntensity) {
  const green = new THREE.Color(0.1, 0.25 + vibrancy * 0.3, 0.05);
  if (hasBloom) {
    green.lerp(new THREE.Color(0.2, 0.45, 0.15), bloomIntensity * 0.3);
  }
  return new THREE.MeshPhongMaterial({
    color: green,
    side: THREE.DoubleSide,
    flatShading: true,
  });
}

function makeBloomMaterial(bloomIntensity) {
  const c = new THREE.Color(1, 0.92, 0.95);
  c.lerp(new THREE.Color(1, 0.8, 0.5), bloomIntensity * 0.3);
  return new THREE.MeshPhongMaterial({
    color: c,
    side: THREE.DoubleSide,
    emissive: c.clone().multiplyScalar(0.15),
  });
}

// Blossom: pink/white flower for active memorization
function makeBlossomMaterial() {
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color(1.0, 0.75, 0.85),
    emissive: new THREE.Color(0.2, 0.05, 0.1),
  });
}

// Fruit: golden/amber for complete memorization
function makeFruitMaterial() {
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color(0.95, 0.7, 0.15),
    emissive: new THREE.Color(0.15, 0.08, 0.0),
  });
}

// ── Branch geometry (cylindrical sections with taper & gnarliness) ──────────

const SEGMENTS = 6;

function buildBranchGeometry(origin, direction, length, radiusBase, level, params, rand) {
  const sections = Math.max(3, Math.ceil(length * 5));
  const vertCount = (sections + 1) * (SEGMENTS + 1);
  const triCount = sections * SEGMENTS * 2;

  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const indices = new Uint16Array(triCount * 3);

  const qOrientation = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  qOrientation.setFromUnitVectors(up, direction.clone().normalize());

  const sectionOrigin = origin.clone();
  const stepLen = length / sections;

  // Trunk (level 0) stays very straight; branches get more organic
  const isTrunk = level === 0;
  const gnarlScale = isTrunk ? 0.15 : Math.min(2.5, 1 + (level * 0.5));
  const upwardBias = isTrunk ? 0.0 : 0.015; // trunk doesn't need correction, it starts vertical

  let vi = 0;

  for (let s = 0; s <= sections; s++) {
    const t = s / sections;
    const r = radiusBase * (1 - t * params.taper);

    if (s > 0) {
      // Gnarliness: organic perturbation, scaled by level
      const gnarl = params.gnarliness * gnarlScale;
      const euler = new THREE.Euler(
        (rand() - 0.5) * gnarl,
        (rand() - 0.5) * params.twist * 0.05,
        (rand() - 0.5) * gnarl
      );
      const qPerturb = new THREE.Quaternion().setFromEuler(euler);
      qOrientation.multiply(qPerturb);

      // Gentle upward correction for branches (keeps tree from drooping)
      if (upwardBias > 0) {
        const currentDir = new THREE.Vector3(0, 1, 0).applyQuaternion(qOrientation);
        if (currentDir.y < 0.3) {
          // Nudge back toward vertical when branch points too low
          const correction = new THREE.Euler(
            -currentDir.z * upwardBias,
            0,
            currentDir.x * upwardBias
          );
          qOrientation.multiply(new THREE.Quaternion().setFromEuler(correction));
        }
      }

      const step = new THREE.Vector3(0, stepLen, 0).applyQuaternion(qOrientation);
      sectionOrigin.add(step);
    }

    for (let seg = 0; seg <= SEGMENTS; seg++) {
      const angle = (seg / SEGMENTS) * Math.PI * 2;
      const local = new THREE.Vector3(
        Math.cos(angle) * r,
        0,
        Math.sin(angle) * r
      );
      local.applyQuaternion(qOrientation);
      const worldPos = sectionOrigin.clone().add(local);
      const normal = local.clone().normalize();

      const idx = vi * 3;
      positions[idx] = worldPos.x;
      positions[idx + 1] = worldPos.y;
      positions[idx + 2] = worldPos.z;
      normals[idx] = normal.x;
      normals[idx + 1] = normal.y;
      normals[idx + 2] = normal.z;
      vi++;
    }
  }

  let ii = 0;
  const stride = SEGMENTS + 1;
  for (let s = 0; s < sections; s++) {
    for (let seg = 0; seg < SEGMENTS; seg++) {
      const a = s * stride + seg;
      const b = a + stride;
      const c = a + 1;
      const d = b + 1;
      indices[ii++] = a; indices[ii++] = b; indices[ii++] = c;
      indices[ii++] = c; indices[ii++] = b; indices[ii++] = d;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));

  return {
    geometry: geo,
    tip: sectionOrigin.clone(),
    tipOrientation: qOrientation.clone(),
  };
}

// ── Leaf cluster at branch tip ──────────────────────────────────────────────

const _leafGeo = new THREE.SphereGeometry(1, 5, 4);
_leafGeo.scale(1, 0.6, 1);

function addLeaves(group, tip, params, leafMat, bloomMat, rand) {
  if (params.leafDensity <= 0) return;

  const count = Math.max(1, Math.round(params.leafDensity * 5));
  const spread = params.leafSize * 2;

  for (let i = 0; i < count; i++) {
    const leaf = new THREE.Mesh(_leafGeo, leafMat);
    const s = params.leafSize * (0.5 + rand() * 0.7);
    leaf.scale.set(s, s * 0.45, s);
    leaf.position.set(
      tip.x + (rand() - 0.5) * spread,
      tip.y + (rand() - 0.2) * spread * 0.5,
      tip.z + (rand() - 0.5) * spread
    );
    leaf.rotation.set(
      rand() * Math.PI * 0.3,
      rand() * Math.PI * 2,
      rand() * Math.PI * 0.3
    );
    group.add(leaf);
  }

  // Bloom flowers
  if (params.hasBloom && rand() < params.bloomIntensity * 0.5) {
    const bloom = new THREE.Mesh(_leafGeo, bloomMat);
    const bs = params.leafSize * 0.45;
    bloom.scale.set(bs, bs, bs);
    bloom.position.set(
      tip.x + (rand() - 0.5) * spread * 0.3,
      tip.y + rand() * spread * 0.3,
      tip.z + (rand() - 0.5) * spread * 0.3
    );
    group.add(bloom);
  }
}

// ── Main tree builder ───────────────────────────────────────────────────────

export function buildTree(state, overrideGrowth) {
  const params = overrideGrowth || computeGrowth(state);
  const rand = mulberry32(params.seed || 42);
  const group = new THREE.Group();

  const barkMat = makeBarkMaterial(params.vibrancy, params.bloomIntensity);
  const leafMat = makeLeafMaterial(params.vibrancy, params.hasBloom, params.bloomIntensity);
  const bloomMat = makeBloomMaterial(params.bloomIntensity);
  const blossomMat = makeBlossomMaterial();
  const fruitMat = makeFruitMaterial();

  // Collect terminal branch tips for fruit placement
  const terminalTips = [];

  // Ground
  const groundGeo = new THREE.CircleGeometry(2, 20);
  const groundMat = new THREE.MeshPhongMaterial({ color: 0x3d2b1f });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  group.add(ground);

  // Seed state
  if (params.growth < 0.01) {
    const seedGeo = new THREE.SphereGeometry(0.05, 8, 6);
    const seedMat = new THREE.MeshPhongMaterial({ color: 0x5c3d1e });
    const seed = new THREE.Mesh(seedGeo, seedMat);
    seed.position.y = 0.03;
    group.add(seed);
    return group;
  }

  // Queue-based branch generation
  const queue = [];

  // Trunk: nearly perfectly vertical (tiny lean for life)
  const trunkDir = new THREE.Vector3(
    (rand() - 0.5) * 0.02,
    1,
    (rand() - 0.5) * 0.02
  ).normalize();

  queue.push({
    origin: new THREE.Vector3(0, 0, 0),
    direction: trunkDir,
    length: params.trunkLength,
    radius: params.trunkRadius,
    level: 0,
  });

  const maxLevel = isFinite(params.levels) ? Math.floor(params.levels) : 2;
  const fractionalLevel = params.levels - maxLevel;

  let safetyIter = 0;
  while (queue.length > 0) {
    if (++safetyIter > 2000) { console.warn('[buildTree] safety limit hit'); break; }
    const branch = queue.shift();
    const { origin, direction, length, radius, level } = branch;

    if (length < 0.03 || radius < 0.003) continue;

    // Build branch mesh
    const { geometry, tip, tipOrientation } = buildBranchGeometry(
      origin, direction, length, radius, level, params, rand
    );
    const mesh = new THREE.Mesh(geometry, barkMat);
    group.add(mesh);

    // Terminal check
    const isTerminal = level >= maxLevel;
    const isPartialLevel = level === maxLevel && fractionalLevel > 0;

    if (isTerminal && !isPartialLevel) {
      addLeaves(group, tip, params, leafMat, bloomMat, rand);
      terminalTips.push(tip.clone());
      continue;
    }

    // Child count
    let childCount;
    if (isPartialLevel) {
      childCount = Math.floor(params.childrenPerNode * fractionalLevel);
      if (rand() < (params.childrenPerNode * fractionalLevel) % 1) {
        childCount++;
      }
      childCount = Math.max(0, childCount);
    } else {
      childCount = Math.round(params.childrenPerNode);
    }

    if (childCount === 0) {
      addLeaves(group, tip, params, leafMat, bloomMat, rand);
      terminalTips.push(tip.clone());
      continue;
    }

    // Spawn children
    const radialOffset = rand() * Math.PI * 2;
    for (let i = 0; i < childCount; i++) {
      const radialAngle = radialOffset + (i / childCount) * Math.PI * 2;
      const pitch = params.branchAngle + (rand() - 0.5) * 0.25;

      // Child direction relative to parent's tip orientation
      const childLocal = new THREE.Vector3(
        Math.sin(pitch) * Math.cos(radialAngle),
        Math.cos(pitch),
        Math.sin(pitch) * Math.sin(radialAngle)
      ).normalize();

      childLocal.applyQuaternion(tipOrientation);

      // Ensure child still points generally upward (clamp downward branches)
      if (childLocal.y < 0.1) {
        childLocal.y = 0.1 + rand() * 0.2;
        childLocal.normalize();
      }

      const childLength = length * params.lengthFalloff * (0.85 + rand() * 0.3);
      const childRadius = radius * params.radiusFalloff * (0.85 + rand() * 0.3);

      // Spawn 70-100% along parent (not all at tip)
      const spawnT = 0.7 + rand() * 0.3;
      const spawnPoint = origin.clone().lerp(tip, spawnT);

      queue.push({
        origin: spawnPoint,
        direction: childLocal,
        length: childLength,
        radius: childRadius,
        level: level + 1,
      });
    }

    // Leaves at near-terminal branches too
    if (level >= maxLevel - 1) {
      addLeaves(group, tip, params, leafMat, bloomMat, rand);
    }
  }

  // Place memorization blossoms/fruit at terminal tips
  const fruits = params.fruits || [];
  if (fruits.length > 0 && terminalTips.length > 0) {
    const _fruitGeo = new THREE.SphereGeometry(1, 6, 5);
    const fruitRand = mulberry32(42); // stable placement

    for (let fi = 0; fi < fruits.length; fi++) {
      const fruit = fruits[fi];
      // Pick a consistent tip for this surah
      const tipIdx = Math.floor(fruitRand() * terminalTips.length);
      const tipPos = terminalTips[tipIdx];

      if (fruit.status === 'complete') {
        // Full fruit: golden sphere
        const mesh = new THREE.Mesh(_fruitGeo, fruitMat);
        const s = 0.07 + params.growth * 0.05;
        mesh.scale.set(s, s * 1.2, s);
        mesh.position.set(
          tipPos.x + (fruitRand() - 0.5) * 0.15,
          tipPos.y + fruitRand() * 0.1,
          tipPos.z + (fruitRand() - 0.5) * 0.15
        );
        group.add(mesh);
      } else {
        // Active blossom: pink sphere, size scales with verse progress
        const mesh = new THREE.Mesh(_fruitGeo, blossomMat);
        // progress is raw verse count; scale relative to a typical surah
        const progressScale = Math.min(1, fruit.progress / 20);
        const s = (0.03 + progressScale * 0.06) * (0.5 + params.growth);
        mesh.scale.set(s, s, s);
        mesh.position.set(
          tipPos.x + (fruitRand() - 0.5) * 0.1,
          tipPos.y + fruitRand() * 0.08,
          tipPos.z + (fruitRand() - 0.5) * 0.1
        );
        group.add(mesh);
      }
    }
  }

  return group;
}
