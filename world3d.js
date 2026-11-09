import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

export function createWorld3D(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10131e');
  scene.fog = new THREE.Fog('#10131e', 32, 82);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  scene.add(new THREE.HemisphereLight('#a9c8e8', '#181923', 1.55));
  const keyLight = new THREE.DirectionalLight('#e2e8ff', 2.4);
  keyLight.position.set(-12, 24, 9); keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -25; keyLight.shadow.camera.right = 25;
  keyLight.shadow.camera.top = 25; keyLight.shadow.camera.bottom = -25;
  keyLight.shadow.bias = -0.0004; scene.add(keyLight, keyLight.target);

  const mat = (color, roughness = 0.72, metalness = 0, emissive = '#000000', intensity = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: intensity });
  const concrete = mat('#292d39', 0.9), asphalt = new THREE.MeshPhysicalMaterial({ color: '#171c29', roughness: 0.28, metalness: 0.42, clearcoat: 0.9, clearcoatRoughness: 0.18 }), darkMetal = mat('#111722', 0.45, 0.65);
  const cyan = mat('#62edff', 0.28, 0.2, '#0aaecb', 2.2), pink = mat('#ff4a9d', 0.32, 0.15, '#dd1265', 1.7);
  const amber = mat('#ffc66e', 0.4, 0.15, '#cc6a20', 1.15), whiteGlow = mat('#d9faff', 0.3, 0.1, '#9deaff', 1.4);

  function box(parent, size, position, material, cast = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(parent, radiusTop, radiusBottom, height, position, material, sides = 10) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides), material);
    mesh.position.set(...position); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function areaLight(color, intensity, distance, position) {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(...position); scene.add(light); return light;
  }

  // A compact rain-darkened intersection, framed by an elevated rail and tall city blocks.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), concrete);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.18; floor.receiveShadow = true; scene.add(floor);
  const arena = new THREE.Mesh(new THREE.PlaneGeometry(32, 24), asphalt);
  arena.rotation.x = -Math.PI / 2; arena.position.y = -0.12; arena.receiveShadow = true; scene.add(arena);
  const roadLine = mat('#68707c', 0.72, 0.05, '#303744', 0.16);
  for (let z = -10; z <= 10; z += 5) {
    box(scene, [25, 0.018, 0.035], [0, -0.095, z], roadLine, false);
  }
  for (const x of [-14.8, 14.8]) {
    box(scene, [0.12, 0.05, 21], [x, -0.02, 0], cyan, false);
  }
  for (const z of [-10.8, 10.8]) {
    box(scene, [30, 0.05, 0.12], [0, -0.02, z], pink, false);
  }
  // Crosswalks, inset drains, and luminous lane studs give the ground readable scale.
  for (let i = 0; i < 7; i++) {
    box(scene, [0.34, 0.025, 2.1], [-13.1 + i * 0.72, -0.09, -7.65], roadLine, false);
    box(scene, [0.34, 0.025, 2.1], [8.9 + i * 0.72, -0.09, 7.65], roadLine, false);
  }
  for (const z of [-8.7, 8.7]) for (let x = -12; x <= 12; x += 4) {
    const stud = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.13), x % 8 ? cyan : pink);
    stud.position.set(x, -0.04, z); scene.add(stud);
  }

  // Streets branch out from the combat hub into a connected four-block district.
  const street = new THREE.Mesh(new THREE.PlaneGeometry(88, 8), asphalt);
  street.rotation.x = -Math.PI / 2; street.position.set(0, -0.105, 0); scene.add(street);
  const crossStreet = new THREE.Mesh(new THREE.PlaneGeometry(8, 88), asphalt);
  crossStreet.rotation.x = -Math.PI / 2; crossStreet.position.set(0, -0.104, 0); scene.add(crossStreet);
  for (const offset of [-20, 20]) {
    const sideRoadX = new THREE.Mesh(new THREE.PlaneGeometry(76, 5), asphalt);
    sideRoadX.rotation.x = -Math.PI / 2; sideRoadX.position.set(0, -0.102, offset); scene.add(sideRoadX);
    const sideRoadZ = new THREE.Mesh(new THREE.PlaneGeometry(5, 76), asphalt);
    sideRoadZ.rotation.x = -Math.PI / 2; sideRoadZ.position.set(offset, -0.101, 0); scene.add(sideRoadZ);
  }
  for (let lane = -40; lane <= 40; lane += 5) {
    box(scene, [0.09, 0.022, 1.8], [0, -0.072, lane], roadLine, false);
    box(scene, [1.8, 0.022, 0.09], [lane, -0.07, 0], roadLine, false);
  }

  // Procedural skyline: dark facades, glowing window bands, rooftop tanks and signage.
  const obstacles = [];
  const buildingMats = ['#262b3a', '#202735', '#2d2939', '#1d3039'].map(c => mat(c, 0.86, 0.12));
  const windowMats = ['#4ed9ed', '#ff4b9b', '#e9b86c', '#9c89ff'].map((c, i) => mat(c, 0.3, 0.15, c, i === 1 ? 1.2 : 0.85));
  const buildings = [
    [-24, -23, 12, 19, 10], [-8, -24, 11, 25, 12], [9, -23, 14, 17, 10], [25, -22, 12, 22, 13],
    [-25, 1, 12, 17, 12], [25, 1, 13, 24, 12], [-23, 23, 15, 21, 12], [-7, 24, 11, 16, 11], [10, 23, 15, 25, 12], [26, 22, 12, 18, 12]
  ];
  buildings.forEach(([x, z, w, h, d], index) => {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    const facade = buildingMats[index % buildingMats.length];
    box(group, [w, h, d], [0, h / 2 - 0.2, 0], facade);
    box(group, [w + 0.22, 0.22, d + 0.22], [0, h - 0.2, 0], darkMetal);
    const faceZ = z < 0 ? d / 2 + 0.025 : -d / 2 - 0.025;
    for (let y = 2.0; y < h - 1; y += 2.1) {
      box(group, [w * 0.82, 0.045, 0.035], [0, y, faceZ], windowMats[(index + Math.floor(y)) % windowMats.length], false);
    }
    for (let col = -1; col <= 1; col++) {
      const pylon = box(group, [0.13, h * 0.78, 0.13], [col * w * 0.31, h * 0.42, faceZ + (z < 0 ? 0.04 : -0.04)], index % 2 ? cyan : pink, false);
      pylon.material = index % 2 ? cyan : pink;
    }
    if (index % 2 === 0) {
      const sign = box(group, [w * 0.48, 0.78, 0.2], [0, Math.min(h - 2, 5.2), faceZ * 1.03], index % 4 ? pink : cyan, false);
      sign.material = index % 4 ? pink : cyan;
      box(group, [w * 0.43, 0.045, 0.24], [0, Math.min(h - 2, 5.2), faceZ * 1.05], whiteGlow, false);
    }
    if (index % 3 === 0) {
      cylinder(group, 0.72, 0.72, 0.85, [w * 0.22, h + 0.32, 0], darkMetal, 12);
      cylinder(group, 0.72, 0.72, 0.07, [w * 0.22, h + 0.78, 0], amber, 12);
    }
  });

  // Overpass behind the fighting lane, with underlighting and support columns.
  const overpass = new THREE.Group(); overpass.position.set(0, 5.2, -15.5); scene.add(overpass);
  box(overpass, [48, 0.7, 5.5], [0, 0, 0], darkMetal);
  box(overpass, [48, 0.1, 5.1], [0, -0.41, 0], concrete, false);
  for (let x = -22; x <= 22; x += 4) {
    box(overpass, [0.11, 0.08, 4.8], [x, -0.48, 0], x % 8 ? cyan : pink, false);
  }
  for (const x of [-19, -9, 2, 13, 22]) {
    box(scene, [0.9, 5.25, 0.9], [x, 2.35, -15.2], darkMetal);
    box(scene, [1.02, 0.09, 1.02], [x, 4.83, -15.2], cyan, false);
  }
  for (const x of [-10, 10]) {
    const lamp = areaLight(x < 0 ? '#31d8ec' : '#f43291', 22, 13, [x, 7, -11]);
    lamp.castShadow = false;
  }
  // Side street kiosks and utility boxes create a lived-in urban perimeter.
  for (const [x, z, color] of [[-16, -7, cyan], [16, 7, pink], [-16, 7, pink], [16, -7, cyan]]) {
    const kiosk = new THREE.Group(); kiosk.position.set(x, 0, z); scene.add(kiosk);
    box(kiosk, [1.35, 2.8, 1.2], [0, 1.4, 0], darkMetal);
    box(kiosk, [1.42, 0.13, 1.28], [0, 2.8, 0], color, false);
    box(kiosk, [0.82, 1.2, 0.05], [0, 1.55, 0.62], color, false);
    box(kiosk, [0.5, 0.055, 0.07], [0, 2.15, 0.68], whiteGlow, false);
    areaLight(color.color, 3.8, 5.5, [x, 2.8, z]);
  }

  // Rain-slick puddles catch stretched neon reflections across the fighting lane.
  const puddleMat = new THREE.MeshPhysicalMaterial({ color: '#102131', roughness: 0.12, metalness: 0.72, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.72, depthWrite: false });
  const reflectionMats = ['#52dbea', '#f34a9b', '#a990ff'].map(color => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
  const puddles = [[-11, -3.2, 2.6, 0.8], [-7.3, 5.4, 1.8, 0.56], [4.1, -6.4, 3.1, 0.68], [10.5, 2.8, 2.4, 0.74], [1.8, 3.6, 1.55, 0.48], [-2.4, -7.3, 1.9, 0.48]];
  puddles.forEach(([x, z, rx, rz], i) => {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40), puddleMat);
    pool.rotation.x = -Math.PI / 2; pool.position.set(x, -0.096, z); pool.scale.set(rx, rz, 1); scene.add(pool);
    for (let j = 0; j < 4; j++) {
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(rx * (0.32 + (j % 3) * 0.18), 0.025 + (j % 2) * 0.018), reflectionMats[(i + j) % reflectionMats.length]);
      streak.rotation.set(-Math.PI / 2, 0, (i * 0.41 + j * 0.18) % 0.8 - 0.4);
      streak.position.set(x + (j - 1.5) * 0.14, -0.085 + j * 0.0004, z + (j % 2 ? 0.12 : -0.12));
      streak.renderOrder = 2; scene.add(streak);
    }
  });

  // Fine diagonal rain is kept as a single dynamic line batch to stay lightweight.
  const rainCount = 340, rainDrops = [], rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const drop = { x: (Math.random() - 0.5) * 46, y: Math.random() * 18 + 1, z: (Math.random() - 0.5) * 50, speed: 9 + Math.random() * 9, length: 0.16 + Math.random() * 0.24 };
    rainDrops.push(drop);
    const p = i * 6; rainPositions[p] = drop.x; rainPositions[p + 1] = drop.y; rainPositions[p + 2] = drop.z;
    rainPositions[p + 3] = drop.x + 0.035; rainPositions[p + 4] = drop.y - drop.length; rainPositions[p + 5] = drop.z + 0.025;
  }
  const rainGeometry = new THREE.BufferGeometry();
  const rainAttribute = new THREE.BufferAttribute(rainPositions, 3).setUsage(THREE.DynamicDrawUsage);
  rainGeometry.setAttribute('position', rainAttribute);
  scene.add(new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#9bd8f2', transparent: true, opacity: 0.22, depthWrite: false })));

  // Kaito: an original street operative in a cropped jacket, bright shoulder panels and visor.
  const player = new THREE.Group(); scene.add(player);
  const playerRig = { arms: [], legs: [], weapon: null, jacket: null };
  const skin = mat('#d8a88a', 0.72), hair = mat('#171a25', 0.55), jacket = mat('#d8e0e7', 0.54, 0.18), pants = mat('#222635', 0.75, 0.08);
  const trim = mat('#ff4c9c', 0.34, 0.2, '#d21567', 1.4), visor = mat('#73f1ff', 0.22, 0.25, '#21d5f0', 1.7), shoe = mat('#10141e', 0.42, 0.32);
  cylinder(player, 0.24, 0.2, 0.68, [0, 1.03, 0], pants, 8);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.68, 0.38), jacket); body.position.y = 1.78; body.castShadow = true; player.add(body);
  box(player, [0.76, 0.12, 0.42], [0, 1.43, 0], trim);
  box(player, [0.13, 0.52, 0.04], [0.22, 1.78, 0.21], whiteGlow, false);
  cylinder(player, 0.13, 0.13, 0.18, [0, 2.2, 0], skin, 10);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), skin); head.position.set(0, 2.48, 0.015); head.castShadow = true; player.add(head);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.54), hair); hairCap.position.set(0, 2.57, -0.015); player.add(hairCap);
  box(player, [0.42, 0.13, 0.12], [0, 2.47, 0.23], visor, false);
  box(player, [0.19, 0.1, 0.18], [-0.48, 1.99, 0], trim);
  const armGeo = new THREE.CapsuleGeometry(0.105, 0.43, 4, 8), legGeo = new THREE.CapsuleGeometry(0.12, 0.4, 4, 8);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.43, 1.99, 0); player.add(arm); playerRig.arms.push(arm);
    const armMesh = new THREE.Mesh(armGeo, jacket); armMesh.position.y = -0.26; arm.add(armMesh);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.12, 9, 7), shoe); glove.position.set(0, -0.55, 0.08); arm.add(glove);
    const leg = new THREE.Group(); leg.position.set(side * 0.17, 1.2, 0); player.add(leg); playerRig.legs.push(leg);
    const legMesh = new THREE.Mesh(legGeo, pants); legMesh.position.y = -0.28; leg.add(legMesh);
    const boot = box(leg, [0.25, 0.16, 0.42], [0, -0.56, 0.1], shoe);
    box(leg, [0.23, 0.035, 0.34], [0, -0.49, 0.12], side < 0 ? cyan : trim, false);
  }
  playerRig.weapon = box(player, [0.12, 0.78, 0.11], [0.51, 1.56, 0.1], darkMetal);
  playerRig.weapon.rotation.z = -0.35;
  const playerShadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({ color: '#070a11', transparent: true, opacity: 0.55, depthWrite: false }));
  playerShadow.rotation.x = -Math.PI / 2; playerShadow.position.y = -0.06; player.add(playerShadow);

  const enemyRecords = new Map();
  const enemyMats = [mat('#8c3dff', 0.38, 0.16, '#5511cb', 1.7), mat('#26e4de', 0.35, 0.2, '#00acae', 1.6), mat('#ff586e', 0.48, 0.2, '#d61242', 1.2)];
  const enemyDark = mat('#141722', 0.58, 0.22), enemyEye = mat('#fff1ff', 0.24, 0.15, '#ffb9f4', 2.4);

  function makeEnemy(enemy) {
    const group = new THREE.Group(); scene.add(group);
    const coreMat = enemyMats[enemy.type] || enemyMats[0];
    const scale = enemy.type === 2 ? 1.28 : enemy.type === 0 ? 0.9 : 1;
    const core = new THREE.Mesh(enemy.type === 0 ? new THREE.OctahedronGeometry(0.56, 1) : new THREE.IcosahedronGeometry(0.58, 1), coreMat);
    core.position.y = enemy.type === 2 ? 1.15 : 1.02; core.scale.set(scale, scale * 1.2, scale * 0.82); core.castShadow = true; group.add(core);
    const shell = new THREE.Mesh(new THREE.TorusGeometry(enemy.type === 2 ? 0.74 : 0.66, 0.055, 8, 32), enemy.type === 2 ? pink : cyan);
    shell.position.y = enemy.type === 2 ? 1.12 : 1.02; shell.rotation.x = Math.PI / 2.5; group.add(shell);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.1), enemyEye); eye.position.set(0, 1.15, 0.48); group.add(eye);
    for (const side of [-1, 1]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, enemy.type === 2 ? 0.78 : 0.52, 6), coreMat);
      spike.position.set(side * (enemy.type === 2 ? 0.53 : 0.4), 1.55, -0.02); spike.rotation.z = side * -0.55; group.add(spike);
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, enemy.type === 2 ? 0.6 : 0.46, 3, 7), enemyDark);
      limb.position.set(side * 0.48, 0.58, 0); limb.rotation.z = side * -0.3; group.add(limb);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.7, 28), new THREE.MeshBasicMaterial({ color: enemy.type === 2 ? '#ff526e' : '#66eaff', transparent: true, opacity: 0.76, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.025; group.add(ring);
    const hpBack = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.09), new THREE.MeshBasicMaterial({ color: '#11131d', side: THREE.DoubleSide }));
    hpBack.position.y = 2.14; group.add(hpBack);
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.055), new THREE.MeshBasicMaterial({ color: enemy.type === 2 ? '#ff5477' : '#6af3ff', side: THREE.DoubleSide }));
    hpFill.position.set(-0.025, 2.14, 0.008); group.add(hpFill);
    const light = new THREE.PointLight(enemy.type === 2 ? '#ff375e' : '#873eff', enemy.type === 2 ? 2 : 1.35, 5, 2); light.position.y = 1.2; group.add(light);
    return { group, core, shell, ring, hpFill, light, phase: enemy.phase || 0, scale };
  }

  const effects = [];
  function burst(position, color, size = 1.2, duration = 0.34) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(size * 0.55, size * 0.74, 32), material);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(position.x, 0.11, position.z); scene.add(mesh);
    effects.push({ mesh, duration, age: 0, size });
  }
  let time = 0, activePulse = 0, pulseType = '';
  const dodgeTrail = [];

  function setEnemies(enemies) {
    const next = new Set(enemies.map(enemy => enemy.id));
    for (const [id, record] of enemyRecords) if (!next.has(id)) { scene.remove(record.group); enemyRecords.delete(id); }
    for (const enemy of enemies) if (!enemyRecords.has(enemy.id)) enemyRecords.set(enemy.id, makeEnemy(enemy));
  }

  function action(name, enemyId, facing) {
    if (name === 'hit') {
      const record = enemyRecords.get(enemyId);
      if (record) burst(record.group.position, record.core.material.color, 0.8, 0.28);
    }
    if (['attack', 'skill', 'ex'].includes(name)) {
      activePulse = name === 'ex' ? 0.7 : name === 'skill' ? 0.42 : 0.24; pulseType = name;
      const color = name === 'ex' ? '#fff08a' : name === 'skill' ? '#fc4dff' : '#65efff';
      burst(player.position, color, name === 'ex' ? 4.3 : name === 'skill' ? 2.8 : 1.9, activePulse);
      playerRig.arms[1].rotation.x = name === 'ex' ? -2.2 : -1.5;
      playerRig.weapon.material = name === 'ex' ? amber : name === 'skill' ? pink : whiteGlow;
    } else if (name === 'dodge') {
      burst(player.position, '#73f1ff', 1.45, 0.28);
      player.material = player.material;
    } else if (name === 'player-hit') {
      burst(player.position, '#ff375f', 1.8, 0.38);
    } else if (name === 'enemy-windup') {
      const record = enemyRecords.get(enemyId);
      if (record) { record.light.intensity = 4.5; record.ring.material.color.set('#fff08a'); }
    }
    if (facing && Number.isFinite(facing.x) && Number.isFinite(facing.z)) player.rotation.y = Math.atan2(facing.x, facing.z);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  function update(state, dt) {
    dt = Math.min(0.05, Math.max(0, dt || 0)); time += dt;
    for (let i = 0; i < rainCount; i++) {
      const drop = rainDrops[i];
      drop.y -= drop.speed * dt;
      drop.x += 0.75 * dt;
      if (drop.y < -0.5) {
        drop.y = 18 + Math.random() * 3;
        drop.x = (Math.random() - 0.5) * 46;
        drop.z = (Math.random() - 0.5) * 50;
      }
      const p = i * 6;
      rainPositions[p] = drop.x; rainPositions[p + 1] = drop.y; rainPositions[p + 2] = drop.z;
      rainPositions[p + 3] = drop.x + 0.035; rainPositions[p + 4] = drop.y - drop.length; rainPositions[p + 5] = drop.z + 0.025;
    }
    rainAttribute.needsUpdate = true;
    const moving = state.running && !state.paused && (Math.abs(state.x - (player.position.x || 0)) > 0.002 || Math.abs(state.z - (player.position.z || 0)) > 0.002);
    player.position.set(state.x, 0, state.z);
    const facing = state.facing || { x: 0, z: -1 };
    player.rotation.y = Math.atan2(facing.x, facing.z);
    const gait = moving ? Math.sin(time * 13) : 0;
    playerRig.legs.forEach((leg, i) => { leg.rotation.x = moving ? gait * (i ? -0.6 : 0.6) : 0; });
    playerRig.arms.forEach((arm, i) => { arm.rotation.x = moving ? gait * (i ? 0.42 : -0.42) : Math.sin(time * 2 + i) * 0.035; });
    if (state.attack) {
      const progress = 1 - state.attack.timer / state.attack.duration;
      playerRig.arms[1].rotation.x = -Math.sin(progress * Math.PI) * (state.attack.kind === 'ex' ? 2.7 : 1.6);
    } else if (activePulse > 0) {
      activePulse = Math.max(0, activePulse - dt);
      if (!activePulse) playerRig.weapon.material = darkMetal;
    }
    player.position.y = state.dodge > 0 ? Math.sin((state.dodge / 0.42) * Math.PI) * 0.16 : Math.sin(time * 2.2) * 0.025;
    playerShadow.material.opacity = state.invulnerable > 0 ? 0.22 : 0.5;
    player.visible = state.invulnerable <= 0 || Math.floor(time * 18) % 2 === 0;

    for (const enemy of state.enemies || []) {
      let record = enemyRecords.get(enemy.id);
      if (!record) { record = makeEnemy(enemy); enemyRecords.set(enemy.id, record); }
      record.group.visible = !enemy.dead;
      if (enemy.dead) continue;
      record.group.position.set(enemy.x, 0, enemy.z);
      record.group.rotation.y = Math.atan2(state.x - enemy.x, state.z - enemy.z);
      record.core.rotation.y += dt * (enemy.type === 2 ? 0.6 : 1.3);
      record.core.rotation.x = Math.sin(time * 2.1 + record.phase) * 0.13;
      record.group.position.y = Math.sin(time * 3.2 + record.phase) * 0.12;
      record.shell.rotation.z += dt * (enemy.type === 2 ? 0.7 : 1.5);
      record.ring.material.color.set(enemy.windup > 0 ? '#fff08a' : enemy.type === 2 ? '#ff526e' : '#66eaff');
      record.light.intensity = enemy.windup > 0 ? 4.2 : 1.4 + Math.sin(time * 4 + record.phase) * 0.28;
      record.hpFill.scale.x = Math.max(0.001, enemy.hp / enemy.maxHp);
      record.hpFill.position.x = -0.5 * (1 - enemy.hp / enemy.maxHp);
      record.hpFill.quaternion.copy(camera.quaternion);
      record.group.children.forEach(child => { if (child.geometry?.type === 'PlaneGeometry' && child !== record.hpFill) child.quaternion.copy(camera.quaternion); });
    }

    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i]; effect.age += dt;
      const p = effect.age / effect.duration;
      effect.mesh.scale.setScalar(0.48 + p * 1.65);
      effect.mesh.material.opacity = Math.max(0, 0.88 * (1 - p));
      if (p >= 1) { scene.remove(effect.mesh); effect.mesh.geometry.dispose(); effect.mesh.material.dispose(); effects.splice(i, 1); }
    }
    // Keep the agent low in frame so the overpass and neon skyline read behind the fight.
    const cameraPos = new THREE.Vector3(state.x, 12.8, state.z + 19);
    camera.position.lerp(cameraPos, 1 - Math.exp(-dt * 3.6));
    camera.lookAt(state.x, 1.8, state.z - 5.2);
    keyLight.position.set(state.x - 12, 24, state.z + 9); keyLight.target.position.set(state.x, 0, state.z);
    renderer.render(scene, camera);
  }
  return { update, action, setEnemies, focus: () => ({ scene, camera, renderer }) };
}
