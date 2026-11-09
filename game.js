import { createWorld3D } from './world3d.js';

(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const world = createWorld3D($('#world3d'));
  const keys = new Set();
  const state = {
    running: false, paused: false, ended: false, x: 0, z: 5, facing: { x: 0, z: -1 },
    health: 100, energy: 0, combo: 0, comboTimer: 0, wave: 1, reward: 0,
    enemies: [], particles: [], attack: null, dodge: 0, invulnerable: 0,
    elapsed: 0, last: 0, spawnId: 0, messageTimer: 0, enemyAttack: 0,
    encounterId: 0, nextEncounter: 0, interacted: new Set(), nearbyLandmark: null
  };
  let audio;

  function tone(freq = 440, duration = 0.08) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'triangle'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.035, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    } catch (_) { /* sound is optional */ }
  }
  function toast(text) { const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 1700); }
  function announce(text, duration = 1.2) {
    $('#messageText').textContent = text;
    $('#centerMessage').classList.add('show');
    state.messageTimer = duration;
  }
  function startEncounter(x, z) {
    const count = 2 + (state.encounterId % 2);
    const types = ['RIFT HOUND', 'STATIC WRAITH', 'GLITCH BRUTE'];
    state.enemies = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + 0.45;
      const radius = 4.2 + (i % 2) * 1.4;
      const brute = i === count - 1 && state.encounterId % 2 === 1;
      return { id: ++state.spawnId, type: brute ? 2 : i % 2, name: types[brute ? 2 : i % 2],
        x: x + Math.cos(angle) * radius, z: z + Math.sin(angle) * radius,
        hp: brute ? 150 : 82 + state.encounterId * 4, maxHp: brute ? 150 : 82 + state.encounterId * 4,
        speed: brute ? 1.05 : 1.5 + Math.random() * 0.25, attack: 1.1 + Math.random(),
        windup: 0, stagger: 0, dead: false, phase: Math.random() * 6 };
    });
    state.encounterId++;
    state.wave = state.encounterId;
    state.nextEncounter = state.elapsed + 34;
    updateHUD(); world.setEnemies(state.enemies);
    announce('RIFT SIGNAL', 1.6); toast('Hostiles converging — clear the signal');
  }
  function updateEncounter() {
    if (state.enemies.some(e => !e.dead)) return;
    if (state.enemies.length) {
      state.enemies = []; world.setEnemies(state.enemies);
      toast('Signal cleared · the district is yours');
    }
    if (state.elapsed < state.nextEncounter) return;
    const sites = [[0, -30], [-30, 0], [30, 0], [0, 30], [-20, -20], [20, 20]];
    const site = sites.find(([x, z]) => Math.hypot(state.x - x, state.z - z) < 7);
    if (site) startEncounter(site[0], site[1]);
  }
  function interact() {
    if (!state.running || state.paused || state.ended) return;
    const landmark = world.landmarkAt(state.x, state.z);
    if (!landmark) { toast('Move closer to a district landmark'); return; }
    if (state.interacted.has(landmark.id)) { toast(`${landmark.name} · already checked in`); return; }
    state.interacted.add(landmark.id);
    world.setLandmarkVisited(landmark.id);
    state.reward += 25; state.energy = Math.min(100, state.energy + 12);
    updateHUD(); toast(`${landmark.name} · ${landmark.description} · +25 CRED`);
    tone(620, 0.12);
  }
  function movePlayer(dx, dz) {
    const nextX = Math.max(-42, Math.min(42, state.x + dx));
    const nextZ = Math.max(-42, Math.min(42, state.z + dz));
    if (world.canMoveTo(nextX, state.z)) state.x = nextX;
    if (world.canMoveTo(state.x, nextZ)) state.z = nextZ;
  }
  function updateHUD() {
    const alive = state.enemies.filter(e => !e.dead);
    $('#waveLabel').textContent = alive.length ? `SIGNAL ${String(state.wave).padStart(2, '0')}` : 'FREE ROAM';
    $('#enemyCount').textContent = alive.length ? `${String(alive.length).padStart(2, '0')} HOSTILES` : 'NO SIGNAL';
    $('#waveFill').style.width = `${100 * (state.enemies.length - alive.length) / Math.max(1, state.enemies.length)}%`;
    $('#rewardCount').textContent = String(state.reward).padStart(3, '0');
    $('#healthText').textContent = `${Math.ceil(state.health)} / 100`;
    $('#healthFill').style.width = `${Math.max(0, state.health)}%`;
    $('#energyText').textContent = `${Math.floor(state.energy)}%`;
    $('#energyFill').style.width = `${state.energy}%`;
    $('#comboNumber').textContent = state.combo;
    $('#combo').classList.toggle('active', state.combo > 1 && state.comboTimer > 0);
    const target = alive.slice().sort((a, b) => distance(a) - distance(b))[0];
    $('#targetCard').classList.toggle('visible', !!target && state.running && !state.ended);
    if (target) {
      $('#targetName').textContent = target.name;
      $('#targetHealth').style.width = `${100 * target.hp / target.maxHp}%`;
    }
  }
  function distance(enemy) { return Math.hypot(enemy.x - state.x, enemy.z - state.z); }
  function targetEnemy(range = 20) {
    return state.enemies.filter(e => !e.dead && distance(e) < range).sort((a, b) => distance(a) - distance(b))[0];
  }
  function hit(enemy, damage, push = 1) {
    enemy.hp -= damage; enemy.stagger = 0.26;
    const dx = enemy.x - state.x, dz = enemy.z - state.z, d = Math.max(0.01, Math.hypot(dx, dz));
    enemy.x += dx / d * push; enemy.z += dz / d * push;
    state.energy = Math.min(100, state.energy + 7);
    state.combo++; state.comboTimer = 2.3;
    world.action('hit', enemy.id);
    if (enemy.hp <= 0) {
      enemy.dead = true; state.reward += 35 + state.wave * 5; state.energy = Math.min(100, state.energy + 9);
      toast(`${enemy.name} disrupted · +${35 + state.wave * 5} CRED`); tone(740, 0.13);
    } else tone(280 + Math.random() * 120, 0.055);
    updateHUD();
  }
  function attack(kind = 'attack') {
    if (!state.running || state.paused || state.ended || state.attack) return;
    if (kind === 'skill' && state.skillCooldown > 0) { toast('Skill recharging'); return; }
    if (kind === 'ex' && state.energy < 100) { toast('EX Drive needs 100%'); return; }
    if (kind === 'skill') state.skillCooldown = 3.8;
    if (kind === 'ex') state.energy = 0;
    const skill = kind === 'skill' || kind === 'ex';
    const hitIds = new Set();
    state.attack = { kind, timer: kind === 'ex' ? 0.65 : skill ? 0.4 : 0.22, duration: kind === 'ex' ? 0.65 : skill ? 0.4 : 0.22, hitIds };
    const range = kind === 'ex' ? 6.2 : kind === 'skill' ? 4.5 : 3.0;
    const arc = kind === 'attack' ? 2.0 : 2.8;
    state.enemies.forEach(e => {
      if (e.dead || distance(e) > range) return;
      const dx = e.x - state.x, dz = e.z - state.z, d = Math.max(0.01, Math.hypot(dx, dz));
      const dot = dx / d * state.facing.x + dz / d * state.facing.z;
      if (dot > (kind === 'ex' ? -0.15 : -0.05)) { hitIds.add(e.id); hit(e, kind === 'ex' ? 115 : kind === 'skill' ? 43 : 24 + Math.min(state.combo, 8) * 2, kind === 'ex' ? 2.6 : skill ? 1.8 : 0.9); }
    });
    world.action(kind, null, state.facing);
    if (kind === 'ex') { announce('EX DRIVE', 1.1); tone(130, 0.3); }
    else if (kind === 'skill') tone(170, 0.14);
  }
  function dodge() {
    if (!state.running || state.paused || state.ended || state.dodge > 0) return;
    const dx = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    const dz = (keys.has('w') || keys.has('arrowup') ? -1 : 0) + (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    if (dx || dz) { const len = Math.hypot(dx, dz); state.facing = { x: dx / len, z: dz / len }; }
    state.x += state.facing.x * 2.7; state.z += state.facing.z * 2.7;
    state.dodge = 0.42; state.invulnerable = 0.56; state.comboTimer = Math.max(state.comboTimer, 0.8);
    world.action('dodge', null, state.facing); tone(660, 0.07);
  }
  function incoming(enemy, dt) {
    const d = distance(enemy);
    if (enemy.stagger > 0) { enemy.stagger -= dt; return; }
    if (enemy.windup > 0) {
      enemy.windup -= dt;
      if (enemy.windup <= 0 && d < 2.2 && state.invulnerable <= 0) {
        state.health = Math.max(0, state.health - (enemy.type === 2 ? 18 : 10));
        state.combo = 0; $('#damageFlash').classList.remove('flash'); void $('#damageFlash').offsetWidth; $('#damageFlash').classList.add('flash');
        world.action('player-hit'); updateHUD(); tone(90, 0.12);
      }
      return;
    }
    if (d > 2.15) {
      const vx = (state.x - enemy.x) / Math.max(d, 0.01), vz = (state.z - enemy.z) / Math.max(d, 0.01);
      enemy.x += vx * enemy.speed * dt; enemy.z += vz * enemy.speed * dt;
    } else if (enemy.attack <= 0) {
      enemy.windup = 0.58; enemy.attack = 1.5 + Math.random() * 0.5;
      world.action('enemy-windup', enemy.id);
    }
    enemy.attack -= dt;
  }
  function endGame(won) {
    state.ended = true; state.paused = true;
    $('#resultOverlay').classList.remove('hidden');
    $('#resultEyebrow').textContent = won ? 'SECTOR CLEARED' : 'AGENT DOWN';
    $('#resultTitle').textContent = won ? 'Clean work.' : 'Run it back.';
    $('#resultCopy').textContent = won ? `Wave ${state.wave} cleared. The overpass is quiet. For now.` : 'The rift is still open. Reset, reload, and take the fight back.';
    $('#continueBtn').textContent = won ? 'NEXT WAVE ↗' : 'RETRY OPERATION ↗';
  }
  function tick(dt) {
    state.elapsed += dt;
    if (state.messageTimer > 0 && (state.messageTimer -= dt) <= 0) $('#centerMessage').classList.remove('show');
    if (!state.running || state.paused || state.ended) return;
    state.skillCooldown = Math.max(0, (state.skillCooldown || 0) - dt);
    state.invulnerable = Math.max(0, state.invulnerable - dt);
    state.dodge = Math.max(0, state.dodge - dt);
    if (state.attack && (state.attack.timer -= dt) <= 0) state.attack = null;
    if (state.comboTimer > 0 && (state.comboTimer -= dt) <= 0) state.combo = 0;
    let dx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let dz = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    if (dx || dz) {
      const len = Math.hypot(dx, dz); dx /= len; dz /= len;
      state.facing = { x: dx, z: dz };
      const speed = state.dodge > 0 ? 11 : 5.2;
      state.x = Math.max(-13, Math.min(13, state.x + dx * speed * dt));
      state.z = Math.max(-9, Math.min(9, state.z + dz * speed * dt));
    }
    state.enemies.forEach(e => { if (!e.dead) incoming(e, dt); });
    if (state.health <= 0) endGame(false);
    if (state.enemies.length && state.enemies.every(e => e.dead)) {
      state.wave++; state.paused = true;
      $('#resultOverlay').classList.remove('hidden'); $('#resultEyebrow').textContent = 'SECTOR CLEARED';
      $('#resultTitle').textContent = 'Clean work.'; $('#resultCopy').textContent = `Wave ${state.wave - 1} cleared. Your combo is the city's new soundtrack.`;
      $('#continueBtn').textContent = 'NEXT WAVE ↗';
    }
    updateHUD();
  }
  function frame(now) {
    const dt = Math.min(0.04, (now - state.last) / 1000 || 0); state.last = now;
    tick(dt); world.update(state, dt); requestAnimationFrame(frame);
  }
  function deploy() {
    state.running = true; state.paused = false; $('#startOverlay').classList.add('hidden');
    makeWave(); toast('WASD move · J strike · K skill · SPACE dodge · R EX Drive');
  }
  function togglePause(force) {
    if (!state.running || state.ended) return;
    state.paused = force ?? !state.paused;
    $('#pauseOverlay').classList.toggle('hidden', !state.paused);
  }
  function bindAction(selector, fn) { $(selector).addEventListener('pointerdown', e => { e.preventDefault(); fn(); }); }
  $('#playBtn').addEventListener('click', deploy);
  $('#resumeBtn').addEventListener('click', () => togglePause(false));
  $('#soundBtn').addEventListener('click', () => { tone(540); toast('Audio enabled for action cues'); });
  $('#continueBtn').addEventListener('click', () => {
    $('#resultOverlay').classList.add('hidden');
    if (state.health <= 0) { state.health = 100; state.energy = 0; state.reward = 0; state.wave = 1; state.x = 0; state.z = 5; }
    state.paused = false; state.ended = false; makeWave(3 + state.wave);
  });
  bindAction('#touchAttack', () => attack('attack'));
  bindAction('#touchSkill', () => attack('skill'));
  bindAction('#touchDodge', dodge);
  document.querySelectorAll('[data-dir]').forEach(button => {
    const map = { up: 'w', down: 's', left: 'a', right: 'd' }, key = map[button.dataset.dir];
    const down = e => { e.preventDefault(); keys.add(key); button.setPointerCapture?.(e.pointerId); };
    const up = e => { e.preventDefault(); keys.delete(key); };
    button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('lostpointercapture', up);
  });
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (k === 'escape') { togglePause(); return; }
    if (e.repeat) return;
    if (k === 'j') attack('attack'); else if (k === 'k') attack('skill'); else if (k === 'r') attack('ex'); else if (k === ' ') dodge();
    keys.add(k);
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  updateHUD(); requestAnimationFrame(frame);
})();
