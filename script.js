/* ============================================================
   OSMAN.SYS — Terminal Portfolio
   Behavior (extracted from index.html)

   Loaded with `defer`, so the DOM is parsed before this runs.
   Functions referenced by inline `onclick=` handlers in the
   markup (cycleTheme, toggleMusic, toggleSound, startSnakeGame,
   closeSnakeGame, avatarPoke) are intentionally global.

   Modules:
     1. Sound engine (WebAudio beeps + SFX toggle)
     2. Background music
     3. Boot sequence
     4. Matrix rain
     5. Hero typewriter
     6. Scroll reveal + skill bars
     7. Theme cycling
     8. Click particles
     9. Link hover sounds
    10. Konami code
    11. Snake game
    12. Avatar buddy
    13. Init
   ============================================================ */

// ========== 0. DEVICE / INPUT MODE ==========
// Phones & tablets get on-screen joystick controls (and Pong falls back to a
// GitHub link); desktops keep the keyboard-driven experience.
const IS_TOUCH =
  (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) ||
  ('ontouchstart' in window && window.innerWidth <= 820);

if (IS_TOUCH && document.body) document.body.classList.add('touch');

// ========== 1. SOUND ENGINE ==========
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playBeep(freq = 800, duration = 0.06, vol = 0.08) {
  if (!soundEnabled) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playBootSound() {
  if (!soundEnabled) return;
  initAudio();
  [200, 400, 600, 800].forEach((f, i) => {
    setTimeout(() => playBeep(f, 0.1, 0.05), i * 100);
  });
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.querySelector('.sound-btn[data-tip="Toggle sounds"]').textContent = soundEnabled ? 'SFX: ON' : 'SFX: OFF';
  if (soundEnabled) playBeep(600, 0.1);
}

// ========== 2. BACKGROUND MUSIC ==========
const bgMusic = document.getElementById('bg-music');
const BG_MUSIC_VOL = 0.15; // low, ambient
let musicOn = false;
let musicStarted = false;

function setMusicLabel() {
  const btn = document.getElementById('music-btn');
  if (btn) btn.innerHTML = musicOn ? '♫ ON' : '♫ OFF';
}

const MUSIC_CREDIT = '♫ Now playing: "Hero\'s Shadow" — My Hero Academia';
let musicCreditTimer = null;

function showMusicCredit() {
  const el = document.getElementById('now-playing');
  if (!el) return;
  el.textContent = MUSIC_CREDIT;
  el.classList.add('show');
  clearTimeout(musicCreditTimer);
  musicCreditTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

function startMusic() {
  bgMusic.volume = BG_MUSIC_VOL;
  const p = bgMusic.play();
  if (p && p.catch) p.catch(() => {}); // ignore autoplay rejection
  musicOn = true;
  musicStarted = true;
  setMusicLabel();
  showMusicCredit();
}

function toggleMusic() {
  if (musicOn) {
    bgMusic.pause();
    musicOn = false;
    setMusicLabel();
  } else {
    startMusic();
  }
}

// Browsers block autoplay-with-sound until a user gesture — kick the
// music off on the first interaction (unless the user already muted it).
function primeMusicOnFirstGesture(e) {
  if (musicStarted) return;
  window.removeEventListener('pointerdown', primeMusicOnFirstGesture);
  window.removeEventListener('keydown', primeMusicOnFirstGesture);
  // If the first gesture IS the music button, let its own handler decide
  // (otherwise we'd start here and the button click would toggle it back off).
  if (e && e.target && e.target.closest && e.target.closest('#music-btn')) return;
  startMusic();
}
window.addEventListener('pointerdown', primeMusicOnFirstGesture);
window.addEventListener('keydown', primeMusicOnFirstGesture);

// ========== 3. BOOT SEQUENCE ==========
const bootLines = [
  { text: 'OSMAN-BIOS v4.90 (c) 2026', delay: 0 },
  { text: 'Checking memory... 16384 MB OK', delay: 200, cls: 'boot-ok' },
  { text: 'Loading kernel modules...', delay: 400 },
  { text: '  [OK] portfolio.ko', delay: 550, cls: 'boot-ok' },
  { text: '  [OK] creativity.ko', delay: 650, cls: 'boot-ok' },
  { text: '  [OK] caffeine.ko', delay: 750, cls: 'boot-ok' },
  { text: '  [WARN] sleep.ko - module not found', delay: 900, cls: 'boot-warn' },
  { text: 'Mounting /dev/brain... done', delay: 1100 },
  { text: 'Starting OSMAN.SYS...', delay: 1350 },
  { text: '', delay: 1500 },
  { text: '> Welcome to Osman\'s terminal. Initializing...', delay: 1650 },
];

function runBoot() {
  const container = document.getElementById('boot-text');
  bootLines.forEach((line, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'line' + (line.cls ? ' ' + line.cls : '');
      div.textContent = line.text;
      div.style.animationDelay = '0s';
      container.appendChild(div);
      if (i === 0) playBootSound();
      if (i < 8) playBeep(300 + i * 60, 0.03, 0.03);
    }, line.delay);
  });

  setTimeout(() => {
    document.getElementById('boot-screen').classList.add('hidden');
    setTimeout(() => {
      document.getElementById('boot-screen').style.display = 'none';
    }, 800);
  }, 2400);
}

// ========== 4. MATRIX RAIN ==========
function initMatrix() {
  const canvas = document.getElementById('matrix-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = Array(columns).fill(1);

  function draw() {
    ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#33ff33';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 50);

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ========== 5. HERO TYPEWRITER ==========
const typedStrings = [
  'Building the future, one commit at a time.',
  'I like strongly typed languages.',
  'Agents, ML, Robotics, Game Dev.',
  'Always exploring, always building.',
  'My job is to make new things.',
  '"This was painful to write."',
];

let typeIdx = 0, charIdx = 0, isDeleting = false;

function typeWriter() {
  const el = document.getElementById('typed-text');
  const current = typedStrings[typeIdx];

  if (!isDeleting) {
    el.innerHTML = '> ' + current.slice(0, charIdx + 1) + '<span class="cursor"></span>';
    charIdx++;
    if (charIdx === current.length) {
      setTimeout(() => { isDeleting = true; typeWriter(); }, 2000);
      return;
    }
    setTimeout(typeWriter, 45 + Math.random() * 30);
  } else {
    el.innerHTML = '> ' + current.slice(0, charIdx) + '<span class="cursor"></span>';
    charIdx--;
    if (charIdx < 0) {
      isDeleting = false;
      charIdx = 0;
      typeIdx = (typeIdx + 1) % typedStrings.length;
      setTimeout(typeWriter, 400);
      return;
    }
    setTimeout(typeWriter, 25);
  }
}

// ========== 6. SCROLL REVEAL + SKILL BARS ==========
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Animate skill bars
        if (entry.target.id === 'skills') {
          entry.target.querySelectorAll('.skill-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.pct + '%';
          });
        }
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('section:not(#hero)').forEach(s => observer.observe(s));
}

// ========== 7. THEME CYCLING ==========
const themes = ['', 'theme-amber', 'theme-blue', 'theme-pink'];
const themeNames = ['green', 'amber', 'blue', 'pink'];
let themeIdx = 0;

function cycleTheme() {
  document.body.classList.remove(...themes.filter(t => t));
  themeIdx = (themeIdx + 1) % themes.length;
  if (themes[themeIdx]) document.body.classList.add(themes[themeIdx]);
  playBeep(500 + themeIdx * 200, 0.1);
}

// ========== 8. CLICK PARTICLES ==========
const particleChars = ['0', '1', '*', '#', '>', '<', '/', '{', '}', ';'];

document.addEventListener('click', (e) => {
  for (let i = 0; i < 5; i++) {
    const p = document.createElement('div');
    p.className = 'click-particle';
    p.textContent = particleChars[Math.floor(Math.random() * particleChars.length)];
    p.style.left = (e.clientX + (Math.random() - 0.5) * 40) + 'px';
    p.style.top = (e.clientY + (Math.random() - 0.5) * 20) + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
  playBeep(400 + Math.random() * 400, 0.04, 0.04);
});

// ========== 9. LINK HOVER SOUNDS ==========
document.addEventListener('mouseover', (e) => {
  if (e.target.matches('a, button, .project-card, .stat-box, .timeline-item')) {
    playBeep(600, 0.03, 0.03);
  }
});

// ========== 10. KONAMI CODE ==========
const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
let konamiIdx = 0;

document.addEventListener('keydown', (e) => {
  if (e.keyCode === konamiCode[konamiIdx]) {
    konamiIdx++;
    if (konamiIdx === konamiCode.length) {
      document.getElementById('konami-reward').classList.add('active');
      playBeep(523, 0.15); setTimeout(() => playBeep(659, 0.15), 150);
      setTimeout(() => playBeep(784, 0.15), 300); setTimeout(() => playBeep(1047, 0.3), 450);
      konamiIdx = 0;
    }
  } else {
    konamiIdx = 0;
  }
});

// ========== 11. SNAKE GAME ==========
let snakeInterval = null;
let snake, food, dir, score, gameOver;

// Shared direction vectors — driven by both the keyboard and the on-screen
// joystick. Ignores 180° reversals (you can't run straight back into yourself).
const SNAKE_DIRS = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};

function snakeSetDir(name) {
  const d = SNAKE_DIRS[name];
  if (!d || !dir || gameOver) return;
  if (d.x !== -dir.x || d.y !== -dir.y) dir = d;
}

// Wire the joystick once; it stays inert until a game is running.
function initSnakeDpad() {
  const pad = document.getElementById('game-dpad');
  if (!pad) return;
  pad.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
    const press = (e) => {
      e.preventDefault();
      snakeSetDir(btn.dataset.dir);
      btn.classList.add('pressed');
      playBeep(700, 0.03, 0.05);
    };
    const release = () => btn.classList.remove('pressed');
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
    // stop touches on the pad from scrolling the page
    btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  });
}

function startSnakeGame() {
  const modal = document.getElementById('game-modal');
  modal.classList.add('active');
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const size = 15;
  const cols = canvas.width / size;
  const rows = canvas.height / size;

  snake = [{ x: 10, y: 10 }];
  dir = { x: 1, y: 0 };
  score = 0;
  gameOver = false;
  placeFood();
  document.getElementById('game-score').textContent = '0';

  function placeFood() {
    food = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    };
  }

  if (snakeInterval) clearInterval(snakeInterval);

  snakeInterval = setInterval(() => {
    if (gameOver) return;

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows ||
        snake.some(s => s.x === head.x && s.y === head.y)) {
      gameOver = true;
      playBeep(150, 0.3, 0.1);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff3333';
      ctx.font = '20px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#33ff33';
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      document.getElementById('game-score').textContent = score;
      playBeep(800, 0.08);
      placeFood();
    } else {
      snake.pop();
    }

    // Draw
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(51,255,51,0.05)';
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        ctx.strokeRect(x * size, y * size, size, size);
      }
    }

    // Snake
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#66ff66' : '#33ff33';
      ctx.fillRect(s.x * size + 1, s.y * size + 1, size - 2, size - 2);
    });

    // Food
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(food.x * size + 2, food.y * size + 2, size - 4, size - 4);
  }, 100);

  // Controls
  const keyDirs = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right'
  };
  window._snakeKeyHandler = (e) => {
    if (e.key === 'Escape') { closeSnakeGame(); return; }
    if (keyDirs[e.key]) {
      snakeSetDir(keyDirs[e.key]);
      e.preventDefault();
    }
  };
  document.addEventListener('keydown', window._snakeKeyHandler);
  playBeep(440, 0.1);
}

function closeSnakeGame() {
  document.getElementById('game-modal').classList.remove('active');
  if (snakeInterval) clearInterval(snakeInterval);
  if (window._snakeKeyHandler) {
    document.removeEventListener('keydown', window._snakeKeyHandler);
  }
}

// ========== 12. AVATAR BUDDY ==========
// The corner avatar speaks Osman's quotes in a speech bubble, and
// pops a random greeting when you poke it.
const avatarQuotes = [
  'Building the future, one commit at a time.',
  'I like strongly typed languages.',
  'Agents, ML, Robotics, Game Dev.',
  'Always exploring, always building.',
  'My job is to make new things.',
  'Sleep.ko: module not found.',
  'Caffeine -> code -> repeat.',
  'If a bug has no observer, is it still a bug? \n ...yes.',
  'I think, therefore I am... probably a race condition.',
  'The cake is a lie, but the segfault is real.',
  'We are all just NPCs in someone else\'s git history.',
  'To understand recursion, first understand recursion.',
  'I named a variable "temp". It has been here three years.',
  'Schrodinger\'s code: it works and it doesn\'t until you push.',
  'A bug, when it is fixed, is no longer a bug.',
  'The server is down because it can\'t be high.',
  'Time is an illusion. Deadlines doubly so.',
  'I don\'t fear death. I fear merge conflicts.',
  'Every "it works on my machine" is a tiny act of faith.',
  'Reality is the only API with no rate limit.',
  'If you delete all the code, there is no more code... or bugs',
  'Entropy always wins. So does the deadline.',
  'Was the void staring back, or just my dark-mode terminal?',
  'The function returns once it has returned.',
  'I\'m not lazy. I\'m conserving energy for when I really need it.',
  'A wise man once said: "// TODO: figure this out later".',
  'Determinism is a comforting lie we tell our debuggers.',
  'People die when they are killed.',
  'You cannot push if you have nothing to commit.',
  'When the loop ends, it stops looping.',
  'Code that is not written cannot be debugged.',
  'The most efficient code is the code I was too tired to write.',
  'If the test passes, then it did not fail.',
  'A deadline is late only after it has passed.',
  'Nothing is null until it is not something.',
  'You only run out of memory when there is none left.',
  'A merge conflict happens when two things conflict.',
  'If nobody reads the docs, the docs are unread.',
  'The future has not happened yet. That is why it is the future.',
  'My ultimate goal in life is to be listless.',
  'Someone who is carried to class still, technically, arrives.',
  'If I move any slower I qualify as a static variable.',
  'A nap is just garbage collection for the soul.',
  'Listlessness is the goal, not a bug.',
  'A hero who loses has, regrettably, not won.',
  'Effort is a finite resource.',
  'When you are asleep, you are not awake.',
  'If you die, I\'ll kill you.',
];

// Shuffle the quote order on each load (Fisher-Yates) so the avatar
// doesn't always open with the same line, while still cycling through all.
for (let i = avatarQuotes.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [avatarQuotes[i], avatarQuotes[j]] = [avatarQuotes[j], avatarQuotes[i]];
}

const avatarPokes = [
  'hey!', 'sup!', 'yo!', 'hi there!', 'boop!', 'howdy!',
  'oh, hi!', "what's up?", 'hello, world!', '*waves*', 'beep boop!',
];

let avatarQuoteIdx = 0;
let avatarCycleTimer = null;
let avatarTypeTimer = null;
let avatarBusy = false;

function avatarType(text, onDone) {
  const bubble = document.getElementById('avatar-bubble');
  clearTimeout(avatarTypeTimer);
  bubble.classList.add('show');
  let i = 0;
  (function step() {
    bubble.innerHTML = text.slice(0, i) + '<span class="bubble-cursor"></span>';
    if (i < text.length) {
      if (text[i] !== ' ') playBeep(820, 0.015, 0.02);
      i++;
      avatarTypeTimer = setTimeout(step, 38 + Math.random() * 30);
    } else {
      bubble.innerHTML = text;
      if (onDone) onDone();
    }
  })();
}

function avatarHide() {
  document.getElementById('avatar-bubble').classList.remove('show');
}

function avatarCycle() {
  if (avatarBusy) return;
  const text = avatarQuotes[avatarQuoteIdx];
  avatarQuoteIdx = (avatarQuoteIdx + 1) % avatarQuotes.length;
  avatarType(text, () => {
    // keep the quote up for a bit, then hide before the next one
    avatarCycleTimer = setTimeout(() => {
      avatarHide();
      avatarCycleTimer = setTimeout(avatarCycle, 1200);
    }, 4200);
  });
}

function avatarPoke() {
  const buddy = document.getElementById('avatar-buddy');
  buddy.classList.remove('poke');
  void buddy.offsetWidth; // restart the bounce animation
  buddy.classList.add('poke');
  playBeep(660, 0.08, 0.06);
  setTimeout(() => playBeep(990, 0.08, 0.06), 70);

  // interrupt the quote cycle and say a quick greeting
  avatarBusy = true;
  clearTimeout(avatarCycleTimer);
  const word = avatarPokes[Math.floor(Math.random() * avatarPokes.length)];
  avatarType(word, () => {
    avatarCycleTimer = setTimeout(() => {
      avatarHide();
      avatarBusy = false;
      avatarCycleTimer = setTimeout(avatarCycle, 1400);
    }, 1600);
  });
}

// ========== 13. INIT ==========
window.addEventListener('DOMContentLoaded', () => {
  runBoot();
  initMatrix();
  setTimeout(typeWriter, 2600);
  setTimeout(avatarCycle, 3200); // avatar starts chatting after boot
  initScrollReveal();
  initSnakeDpad();
  if (IS_TOUCH) document.body.classList.add('touch'); // in case body wasn't ready earlier
});
