/* ─────────────────────────────────────────────
   NOVA BLAST — game.js
   Pure HTML5 Canvas + Vanilla JS
   Clean, modular game architecture
───────────────────────────────────────────── */

'use strict';

// ── SOUND ENGINE (Web Audio API) ─────────────────────────────────────────────

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let   audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone({ type = 'square', freq = 440, freq2, duration = 0.15,
                    volume = 0.4, attack = 0.005, decay = 0.1, detune = 0 }) {
  try {
    const ac  = getAudio();
    const osc = ac.createOscillator();
    const gain= ac.createGain();
    const now = ac.currentTime;

    osc.type      = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, now + duration);
    if (detune) osc.detune.setValueAtTime(detune, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  } catch (e) { /* audio blocked — silent fail */ }
}

function playNoise({ duration = 0.1, volume = 0.3, freq = 800, q = 1 }) {
  try {
    const ac     = getAudio();
    const buf    = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ac.createBufferSource();
    source.buffer= buf;
    const filter = ac.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain   = ac.createGain();
    const now    = ac.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    source.start(now);
    source.stop(now + duration + 0.05);
  } catch (e) {}
}

// ── SOUND LIBRARY ────────────────────────────────────────────────────────────

const SFX = {
  shoot() {
    playTone({ type: 'square', freq: 880, freq2: 440, duration: 0.08, volume: 0.25, attack: 0.001 });
  },
  shootTriple() {
    [0, 0.04, 0.08].forEach(d => setTimeout(() =>
      playTone({ type: 'square', freq: 1100, freq2: 550, duration: 0.07, volume: 0.2, attack: 0.001 }), d * 1000));
  },
  enemyExplode() {
    playNoise({ duration: 0.22, volume: 0.5, freq: 280, q: 0.8 });
    playTone({ type: 'sawtooth', freq: 180, freq2: 60, duration: 0.2, volume: 0.3, attack: 0.002 });
  },
  tankExplode() {
    playNoise({ duration: 0.4, volume: 0.7, freq: 140, q: 0.5 });
    playTone({ type: 'sawtooth', freq: 120, freq2: 40, duration: 0.35, volume: 0.4, attack: 0.005 });
  },
  playerHit() {
    playNoise({ duration: 0.3, volume: 0.6, freq: 400, q: 1.5 });
    playTone({ type: 'sawtooth', freq: 220, freq2: 80, duration: 0.25, volume: 0.35, attack: 0.005 });
  },
  powerup() {
    [0, 0.08, 0.16].forEach((d, i) => setTimeout(() =>
      playTone({ type: 'sine', freq: 440 + i * 220, duration: 0.12, volume: 0.35, attack: 0.005 }), d * 1000));
  },
  bomb() {
    playNoise({ duration: 0.6, volume: 0.8, freq: 100, q: 0.4 });
    playTone({ type: 'sawtooth', freq: 80, freq2: 20, duration: 0.55, volume: 0.5, attack: 0.01 });
  },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() =>
      playTone({ type: 'sine', freq: f, duration: 0.18, volume: 0.4, attack: 0.01 }), i * 130));
  },
  gameOver() {
    [440, 370, 311, 261].forEach((f, i) => setTimeout(() =>
      playTone({ type: 'sawtooth', freq: f, duration: 0.25, volume: 0.35, attack: 0.01 }), i * 200));
  },
  enemyBullet() {
    playTone({ type: 'sine', freq: 200, freq2: 120, duration: 0.06, volume: 0.1, attack: 0.001 });
  },
  shieldBlock() {
    playTone({ type: 'sine', freq: 660, freq2: 880, duration: 0.15, volume: 0.3, attack: 0.005 });
  },
};

// Unlock audio on first user interaction
function unlockAudio() {
  getAudio();
  document.removeEventListener('keydown', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('click', unlockAudio);
}
document.addEventListener('keydown',    unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('click',      unlockAudio, { once: true });

// Portrait mode is fully supported — no orientation lock needed
function onGameStart() {}

// ── CANVAS SETUP ────────────────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const COLORS = {
  primary:   '#00f5ff',
  secondary: '#ff3cac',
  accent:    '#f5c400',
  danger:    '#ff4444',
  green:     '#00ff88',
  bg:        '#040810',
};

const PLAYER = {
  width:   40,
  height:  48,
  speed:   5.5,
  fireRate: 220,         // ms between shots
};

const BULLET = {
  width:  4,
  height: 16,
  speed:  10,
};

const POWERUP_TYPES = ['shield', 'rapidfire', 'trishot', 'bomb'];

// ── GAME STATE ────────────────────────────────────────────────────────────────

let state = {};

function resetState() {
  state = {
    running:   false,
    score:     0,
    level:     1,
    lives:     3,
    wave:      0,
    enemiesKilled: 0,
    totalKilled:   0,

    player: {
      x: canvas.width / 2,
      y: canvas.height - 100,
      dx: 0,
      dy: 0,
      invincible: false,
      invincibleTimer: 0,
      shield: false,
      rapidFire: false,
      triShot: false,
      powerupTimer: 0,
      lastShot: 0,
      thrusterFrame: 0,
    },

    bullets:  [],
    enemies:  [],
    eBullets: [],
    particles:[],
    powerups: [],
    stars:    generateStars(),
    starSpeed: 1.5,
  };
}

// ── STARS ────────────────────────────────────────────────────────────────────

function generateStars() {
  const stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x:     Math.random() * 2000,
      y:     Math.random() * 2000,
      r:     Math.random() * 1.5 + 0.3,
      speed: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.7 + 0.2,
    });
  }
  return stars;
}

// ── INPUT ─────────────────────────────────────────────────────────────────────

const keys = {};
let   fireHeld = false;

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); fireHeld = true; }
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space') fireHeld = false;
});

// ── MOBILE JOYSTICK ────────────────────────────────────────────────────────────

const joystickZone = document.getElementById('joystick-zone');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const btnFire      = document.getElementById('btn-fire');

const joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null };
const baseRadius = 50;
const knobRadius = 22;

joystickZone.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joystick.active = true;
  joystick.id     = t.identifier;
  const rect = joystickBase.getBoundingClientRect();
  joystick.startX = rect.left + rect.width / 2;
  joystick.startY = rect.top  + rect.height / 2;
}, { passive: false });

joystickZone.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== joystick.id) continue;
    const dx  = t.clientX - joystick.startX;
    const dy  = t.clientY - joystick.startY;
    const dist = Math.hypot(dx, dy);
    const maxDist = baseRadius - knobRadius;
    const clamp   = Math.min(dist, maxDist);
    const angle   = Math.atan2(dy, dx);
    joystick.dx   = Math.cos(angle) * (clamp / maxDist);
    joystick.dy   = Math.sin(angle) * (clamp / maxDist);
    const kx = Math.cos(angle) * clamp;
    const ky = Math.sin(angle) * clamp;
    joystickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
  }
}, { passive: false });

function resetJoystick() {
  joystick.active = false;
  joystick.dx = 0;
  joystick.dy = 0;
  joystickKnob.style.transform = 'translate(-50%, -50%)';
}

joystickZone.addEventListener('touchend',    e => { e.preventDefault(); resetJoystick(); }, { passive: false });
joystickZone.addEventListener('touchcancel', e => { e.preventDefault(); resetJoystick(); }, { passive: false });

btnFire.addEventListener('touchstart',  e => { e.preventDefault(); fireHeld = true;  }, { passive: false });
btnFire.addEventListener('touchend',    e => { e.preventDefault(); fireHeld = false; }, { passive: false });
btnFire.addEventListener('touchcancel', e => { e.preventDefault(); fireHeld = false; }, { passive: false });

// ── SCREENS ────────────────────────────────────────────────────────────────────

const screens = {
  menu:     document.getElementById('screen-menu'),
  game:     document.getElementById('screen-game'),
  gameover: document.getElementById('screen-gameover'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ── BEST SCORE ────────────────────────────────────────────────────────────────

function getBest() { return parseInt(localStorage.getItem('novablast_best') || '0'); }
function setBest(s) { if (s > getBest()) localStorage.setItem('novablast_best', s); }

// ── GAME START / STOP ──────────────────────────────────────────────────────────

let animFrame = null;

function startGame() {
  resetState();
  showScreen('game');
  updateHUD();
  spawnWave();
  state.running = true;
  if (animFrame) cancelAnimationFrame(animFrame);
  loop();
}

function endGame() {
  state.running = false;
  SFX.gameOver();
  setBest(state.score);
  document.getElementById('go-score').textContent = state.score;
  document.getElementById('go-best').textContent  = `BEST: ${getBest()}`;
  document.getElementById('go-title').textContent = state.score > 2000 ? 'MISSION COMPLETE' : 'MISSION FAILED';
  document.getElementById('go-stats').innerHTML   =
    `ENEMIES DEFEATED: ${state.totalKilled}<br>WAVES CLEARED: ${state.wave - 1}`;
  showScreen('gameover');
}

// ── HUD ────────────────────────────────────────────────────────────────────────

function updateHUD() {
  const scoreEl = document.getElementById('hud-score');
  const levelEl = document.getElementById('hud-level');
  scoreEl.textContent = state.score;
  levelEl.textContent = state.level;

  // Lives hearts
  const lives = document.querySelectorAll('.life');
  lives.forEach((el, i) => {
    el.classList.toggle('lost', i >= state.lives);
  });
}

function popScore() {
  const el = document.getElementById('hud-score');
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 200);
}

// ── LEVEL UP FLASH ─────────────────────────────────────────────────────────────

function showLevelFlash(text) {
  const el = document.getElementById('level-flash');
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

// ── WAVE SPAWNING ──────────────────────────────────────────────────────────────

function spawnWave() {
  state.wave++;
  const lvl    = state.level;
  const count  = 4 + (lvl - 1) * 2;
  const cols   = Math.min(count, 8);
  const rows   = Math.ceil(count / cols);
  const types  = lvl < 3 ? ['basic'] : lvl < 5 ? ['basic','fast'] : ['basic','fast','tank'];
  const spacingX = Math.min(80, (canvas.width - 80) / cols);
  const startX   = (canvas.width - spacingX * (cols - 1)) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r * cols + c >= count) break;
      const type = types[Math.floor(Math.random() * types.length)];
      state.enemies.push(createEnemy(type, startX + c * spacingX, 60 + r * 70));
    }
  }
  state.starSpeed = 1.5 + lvl * 0.4;
}

function createEnemy(type, x, y) {
  const configs = {
    basic: { hp: 1, speed: 1.0, size: 32, color: COLORS.secondary, score: 100, fireRate: 3500 },
    fast:  { hp: 1, speed: 2.2, size: 26, color: COLORS.primary,   score: 150, fireRate: 2800 },
    tank:  { hp: 3, speed: 0.7, size: 44, color: COLORS.accent,    score: 300, fireRate: 4500 },
  };
  const cfg = configs[type];
  return {
    type, x, y,
    startX: x,
    ...cfg,
    maxHp: cfg.hp,
    t:      Math.random() * Math.PI * 2,
    dir:    1,
    lastShot: Date.now() + Math.random() * 2000,
  };
}

// ── PARTICLES ─────────────────────────────────────────────────────────────────

function spawnExplosion(x, y, color, count = 18) {
  for (let i = 0; i < count; i++) {
    const angle  = (Math.PI * 2 / count) * i + Math.random() * 0.4;
    const speed  = Math.random() * 4 + 1;
    state.particles.push({
      x, y,
      vx:   Math.cos(angle) * speed,
      vy:   Math.sin(angle) * speed,
      life: 1,
      decay: Math.random() * 0.03 + 0.02,
      r:    Math.random() * 3 + 1,
      color,
    });
  }
}

function spawnHitParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    state.particles.push({
      x, y,
      vx:   (Math.random() - 0.5) * 4,
      vy:   (Math.random() - 0.5) * 4,
      life: 0.8,
      decay: 0.06,
      r:    2,
      color,
    });
  }
}

// ── SHOOTING ──────────────────────────────────────────────────────────────────

function playerShoot(now) {
  const rate   = state.player.rapidFire ? PLAYER.fireRate / 2.5 : PLAYER.fireRate;
  if (now - state.player.lastShot < rate) return;
  state.player.lastShot = now;

  const { x, y } = state.player;

  if (state.player.triShot) {
    SFX.shootTriple();
    [-18, 0, 18].forEach(offset => {
      state.bullets.push({ x: x + offset, y: y - 24, vx: offset * 0.06, vy: -BULLET.speed });
    });
  } else {
    SFX.shoot();
    state.bullets.push({ x, y: y - 24, vx: 0, vy: -BULLET.speed });
  }
}

function enemyShoot(enemy) {
  const angle = Math.atan2(
    state.player.y - enemy.y,
    state.player.x - enemy.x
  );
  const speed = enemy.type === 'fast' ? 5 : 3.5;
  state.eBullets.push({
    x:    enemy.x,
    y:    enemy.y + enemy.size / 2,
    vx:   Math.cos(angle) * speed,
    vy:   Math.sin(angle) * speed,
    life: 1,
  });
}

// ── POWERUP SPAWN ─────────────────────────────────────────────────────────────

function maybeSpawnPowerup(x, y) {
  if (Math.random() > 0.22) return;
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  state.powerups.push({ x, y, type, vy: 1.5, t: 0 });
}

// ── COLLISION ─────────────────────────────────────────────────────────────────

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  return Math.hypot(cx - nearX, cy - nearY) < cr;
}

// ── BOMB POWERUP ──────────────────────────────────────────────────────────────

function activateBomb() {
  SFX.bomb();
  state.enemies.forEach(e => {
    spawnExplosion(e.x, e.y, e.color, 12);
    state.score += e.score;
    state.totalKilled++;
    state.enemiesKilled++;
  });
  popScore();
  state.enemies = [];
  // screen flash
  ctx.fillStyle = 'rgba(245,196,0,0.35)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  updateHUD();
}

// ── UPDATE ─────────────────────────────────────────────────────────────────────

function update(now, dt) {
  const p = state.player;

  // ── Player movement
  const spd = PLAYER.speed;
  let vx = 0, vy = 0;

  if (keys['ArrowLeft']  || keys['KeyA']) vx -= spd;
  if (keys['ArrowRight'] || keys['KeyD']) vx += spd;
  if (keys['ArrowUp']    || keys['KeyW']) vy -= spd;
  if (keys['ArrowDown']  || keys['KeyS']) vy += spd;

  // Joystick
  if (Math.abs(joystick.dx) > 0.05 || Math.abs(joystick.dy) > 0.05) {
    vx = joystick.dx * spd;
    vy = joystick.dy * spd;
  }

  p.x = Math.max(20, Math.min(canvas.width  - 20, p.x + vx));
  p.y = Math.max(60, Math.min(canvas.height - 20, p.y + vy));

  p.thrusterFrame += 0.25;

  // ── Shoot
  if (fireHeld) playerShoot(now);

  // ── Invincibility timer
  if (p.invincible) {
    p.invincibleTimer -= dt;
    if (p.invincibleTimer <= 0) p.invincible = false;
  }

  // ── Powerup timer
  if (p.shield || p.rapidFire || p.triShot) {
    p.powerupTimer -= dt;
    if (p.powerupTimer <= 0) {
      p.shield = p.rapidFire = p.triShot = false;
    }
  }

  // ── Bullets (player)
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    if (b.y < -20) { state.bullets.splice(i, 1); continue; }

    let hit = false;
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (rectsOverlap(b.x - 2, b.y - 8, 4, 16, e.x - e.size/2, e.y - e.size/2, e.size, e.size)) {
        spawnHitParticles(b.x, b.y, e.color);
        e.hp--;
        state.bullets.splice(i, 1);
        hit = true;

        if (e.hp <= 0) {
          spawnExplosion(e.x, e.y, e.color);
          e.type === 'tank' ? SFX.tankExplode() : SFX.enemyExplode();
          maybeSpawnPowerup(e.x, e.y);
          state.score += e.score * state.level;
          state.totalKilled++;
          state.enemiesKilled++;
          state.enemies.splice(j, 1);
          popScore();
          updateHUD();
        }
        break;
      }
    }
    if (hit) continue;
  }

  // ── Enemy bullets
  for (let i = state.eBullets.length - 1; i >= 0; i--) {
    const b = state.eBullets[i];
    b.x += b.vx;
    b.y += b.vy;

    if (b.x < -20 || b.x > canvas.width + 20 || b.y > canvas.height + 20 || b.y < -20) {
      state.eBullets.splice(i, 1);
      continue;
    }

    if (!p.invincible &&
        circleRect(b.x, b.y, 6, p.x - 16, p.y - 20, 32, 40)) {
      state.eBullets.splice(i, 1);
      spawnHitParticles(p.x, p.y, COLORS.danger);
      if (p.shield) {
        SFX.shieldBlock();
        p.shield = false;
        p.powerupTimer = 0;
        spawnExplosion(p.x, p.y, COLORS.primary, 10);
      } else {
        SFX.playerHit();
        hitPlayer();
      }
    }
  }

  // ── Enemies movement + shooting
  const t = now * 0.001;
  state.enemies.forEach(e => {
    e.t += 0.015 * e.speed;
    e.x  = e.startX + Math.sin(e.t) * (40 + state.level * 8);
    e.y += 0.3 * e.speed;

    // Enemy shoots
    if (now - e.lastShot > e.fireRate) {
      e.lastShot = now;
      enemyShoot(e);
      SFX.enemyBullet();
    }

    // Enemy reaches bottom
    if (e.y > canvas.height + 50) {
      state.enemies.splice(state.enemies.indexOf(e), 1);
      hitPlayer();
    }

    // Enemy collides with player
    if (!p.invincible &&
        rectsOverlap(e.x - e.size/2, e.y - e.size/2, e.size, e.size,
                     p.x - 16, p.y - 20, 32, 40)) {
      spawnExplosion(e.x, e.y, e.color);
      state.enemies.splice(state.enemies.indexOf(e), 1);
      if (!p.shield) hitPlayer(); else { SFX.shieldBlock(); p.shield = false; }
    }
  });

  // ── Powerups
  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const pu = state.powerups[i];
    pu.y += pu.vy;
    pu.t += 0.05;

    if (pu.y > canvas.height + 40) { state.powerups.splice(i, 1); continue; }

    if (rectsOverlap(pu.x - 14, pu.y - 14, 28, 28, p.x - 18, p.y - 22, 36, 44)) {
      applyPowerup(pu.type);
      SFX.powerup();
      spawnExplosion(pu.x, pu.y, getPowerupColor(pu.type), 10);
      state.powerups.splice(i, 1);
    }
  }

  // ── Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x    += pt.vx;
    pt.y    += pt.vy;
    pt.vx   *= 0.95;
    pt.vy   *= 0.95;
    pt.life -= pt.decay;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  // ── Stars
  state.stars.forEach(s => {
    s.y += s.speed * state.starSpeed;
    if (s.y > canvas.height + 5) {
      s.y = -5;
      s.x = Math.random() * canvas.width;
    }
  });

  // ── Wave cleared?
  if (state.enemies.length === 0) {
    if (state.enemiesKilled > 0) {
      state.level++;
      state.enemiesKilled = 0;
      SFX.levelUp();
      showLevelFlash(`LEVEL ${state.level}`);
      updateHUD();
      setTimeout(spawnWave, 1200);
    }
  }
}

function hitPlayer() {
  state.lives--;
  updateHUD();
  state.player.invincible      = true;
  state.player.invincibleTimer = 2000;
  spawnExplosion(state.player.x, state.player.y, COLORS.danger, 20);

  if (state.lives <= 0) {
    setTimeout(endGame, 600);
  }
}

function applyPowerup(type) {
  const p = state.player;
  if (type === 'bomb') {
    activateBomb();
    return;
  }
  p.powerupTimer = 7000;
  if (type === 'shield')    p.shield    = true;
  if (type === 'rapidfire') p.rapidFire = true;
  if (type === 'trishot')   p.triShot   = true;
  showLevelFlash(type.toUpperCase() + '!');
}

function getPowerupColor(type) {
  return { shield: COLORS.primary, rapidfire: COLORS.secondary, trishot: COLORS.green, bomb: COLORS.accent }[type];
}

// ── DRAW ──────────────────────────────────────────────────────────────────────

function draw(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars();
  drawParticles();
  drawPowerups(now);
  drawEnemies(now);
  drawBullets();
  drawEnemyBullets();
  if (state.lives > 0) drawPlayer(now);
}

// ── DRAW: STARS ────────────────────────────────────────────────────────────────

function drawStars() {
  state.stars.forEach(s => {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle   = '#aaddff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ── DRAW: PLAYER SHIP ─────────────────────────────────────────────────────────

function drawPlayer(now) {
  const p   = state.player;
  const { x, y } = p;

  // Blink when invincible
  if (p.invincible && Math.floor(now / 80) % 2 === 0) return;

  ctx.save();
  ctx.translate(x, y);

  // Shield bubble
  if (p.shield) {
    const pulse = 0.1 * Math.sin(now * 0.005) + 0.9;
    ctx.save();
    ctx.globalAlpha = 0.25 * pulse;
    ctx.strokeStyle = COLORS.primary;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.08 * pulse;
    ctx.fillStyle   = COLORS.primary;
    ctx.fill();
    ctx.restore();
  }

  // Thruster flame
  const flicker = 0.4 * Math.sin(p.thrusterFrame * 2.5) + 0.6;
  ctx.save();
  ctx.globalAlpha = 0.85 * flicker;
  const thrGrad = ctx.createLinearGradient(0, 18, 0, 40 * flicker);
  thrGrad.addColorStop(0, '#ff8800');
  thrGrad.addColorStop(0.5, '#ff4400aa');
  thrGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = thrGrad;
  ctx.beginPath();
  ctx.moveTo(-9, 18);
  ctx.lineTo(0,  40 * flicker);
  ctx.lineTo(9,  18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Tri-shot glow
  if (p.triShot) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.shadowColor = COLORS.green;
    ctx.shadowBlur  = 20;
    ctx.restore();
  }

  // Ship body
  const shipColor = p.triShot ? COLORS.green : p.rapidFire ? COLORS.secondary : COLORS.primary;
  ctx.fillStyle   = shipColor;
  ctx.shadowColor = shipColor;
  ctx.shadowBlur  = 12;

  // Main hull
  ctx.beginPath();
  ctx.moveTo(0,   -24);
  ctx.lineTo(16,   14);
  ctx.lineTo(8,    8);
  ctx.lineTo(0,   12);
  ctx.lineTo(-8,   8);
  ctx.lineTo(-16,  14);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle   = COLORS.bg;
  ctx.shadowBlur  = 0;
  ctx.beginPath();
  ctx.ellipse(0, -6, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cockpit glow
  ctx.fillStyle   = shipColor;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(0, -6, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── DRAW: ENEMIES ──────────────────────────────────────────────────────────────

function drawEnemies(now) {
  state.enemies.forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);

    const hpFrac = e.hp / e.maxHp;
    ctx.fillStyle   = e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur  = 10 + 5 * Math.sin(now * 0.004);

    if (e.type === 'basic') {
      // Saucer shape
      ctx.beginPath();
      ctx.ellipse(0, 0, e.size / 2, e.size / 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.bg;
      ctx.beginPath();
      ctx.ellipse(0, -4, e.size / 5, e.size / 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = e.color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(0, -4, e.size / 8, e.size / 9, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (e.type === 'fast') {
      // Arrow fighter
      ctx.beginPath();
      ctx.moveTo(0,  -e.size / 2);
      ctx.lineTo( e.size / 2.5, e.size / 2);
      ctx.lineTo(0,  e.size / 4);
      ctx.lineTo(-e.size / 2.5, e.size / 2);
      ctx.closePath();
      ctx.fill();

    } else if (e.type === 'tank') {
      // Heavy cruiser — hexagon-ish
      const s = e.size / 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0 ? ctx.moveTo(Math.cos(a)*s, Math.sin(a)*s)
                : ctx.lineTo(Math.cos(a)*s, Math.sin(a)*s);
      }
      ctx.closePath();
      ctx.fill();

      // HP bar
      if (e.hp < e.maxHp) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle   = '#333';
        ctx.fillRect(-s, s + 4, s * 2, 4);
        ctx.fillStyle   = hpFrac > 0.5 ? COLORS.green : hpFrac > 0.25 ? COLORS.accent : COLORS.danger;
        ctx.fillRect(-s, s + 4, s * 2 * hpFrac, 4);
      }
    }

    ctx.restore();
  });
}

// ── DRAW: BULLETS ──────────────────────────────────────────────────────────────

function drawBullets() {
  state.bullets.forEach(b => {
    ctx.save();
    ctx.fillStyle   = COLORS.primary;
    ctx.shadowColor = COLORS.primary;
    ctx.shadowBlur  = 8;

    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.vx * 3, b.y + b.vy * 3);
    grad.addColorStop(0, COLORS.primary);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;

    ctx.fillRect(b.x - 2, b.y, 4, 16);
    ctx.restore();
  });
}

function drawEnemyBullets() {
  state.eBullets.forEach(b => {
    ctx.save();
    ctx.fillStyle   = COLORS.secondary;
    ctx.shadowColor = COLORS.secondary;
    ctx.shadowBlur  = 8;
    ctx.globalAlpha = b.life || 1;

    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ── DRAW: POWERUPS ─────────────────────────────────────────────────────────────

const POWERUP_ICONS = { shield: '🛡', rapidfire: '⚡', trishot: '✦', bomb: '💥' };

function drawPowerups(now) {
  state.powerups.forEach(pu => {
    const bob   = Math.sin(pu.t * 3) * 4;
    const color = getPowerupColor(pu.type);
    ctx.save();
    ctx.translate(pu.x, pu.y + bob);

    ctx.shadowColor = color;
    ctx.shadowBlur  = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle   = color;
    ctx.globalAlpha = 0.15;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.font        = '14px sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'middle';
    ctx.fillText(POWERUP_ICONS[pu.type], 0, 0);

    ctx.restore();
  });
}

// ── DRAW: PARTICLES ────────────────────────────────────────────────────────────

function drawParticles() {
  state.particles.forEach(pt => {
    ctx.save();
    ctx.globalAlpha = pt.life;
    ctx.fillStyle   = pt.color;
    ctx.shadowColor = pt.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ── GAME LOOP ─────────────────────────────────────────────────────────────────

let lastTime = 0;

function loop(now = 0) {
  if (!state.running) return;
  const dt = now - lastTime;
  lastTime = now;

  update(now, dt);
  draw(now);

  animFrame = requestAnimationFrame(loop);
}

// ── INIT ──────────────────────────────────────────────────────────────────────

showScreen('menu');
document.getElementById('menu-best').textContent = `BEST &nbsp;${getBest()}`;

document.getElementById('btn-start').addEventListener('click', () => { startGame(); onGameStart(); });
document.getElementById('btn-restart').addEventListener('click', () => { startGame(); onGameStart(); });
document.getElementById('btn-menu').addEventListener('click', () => showScreen('menu'));