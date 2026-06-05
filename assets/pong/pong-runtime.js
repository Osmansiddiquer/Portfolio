/*
 * pong-runtime.js — boots the WebAssembly Pong binary inside a draggable
 * terminal window on the site.
 *
 * The C game (compiled from github.com/Osmansiddiquer/pong via Emscripten)
 * writes ANSI escape sequences to stdout; we render them with xterm.js using
 * its WebGL renderer. Keyboard input is polled the same way the original used
 * GetAsyncKeyState — the browser's KeyboardEvent.keyCode already lines up with
 * the Windows virtual-key codes the game expects.
 *
 * Exposes window.OsmanPong = { open, close, toggle }.
 */
(function () {
  'use strict';

  var COLS = 210, ROWS = 54;          // the game's fixed console dimensions
  var BASE = 'assets/pong/';

  var term = null, webglAddon = null, moduleInstance = null;
  var opened = false, generation = 0;
  var readResolver = null, readBuf = '';

  // Keys the game uses — we preventDefault these so the page doesn't scroll.
  var GAME_KEYS = {37:1,38:1,39:1,40:1,32:1,13:1};

  function $(id) { return document.getElementById(id); }

  /* ---------------- window construction (built once) ------------------- */
  function buildWindow() {
    if ($('pong-window')) return;
    var w = document.createElement('div');
    w.id = 'pong-window';
    w.innerHTML =
      '<div id="pong-titlebar">' +
        '<span class="pong-title">▒ pong.exe — /usr/games/pong</span>' +
        '<span class="pong-dots"><i></i><i></i><button id="pong-close" title="close">×</button></span>' +
      '</div>' +
      '<div id="pong-body"><div id="pong-screen-scaler"><div id="pong-screen"></div></div></div>' +
      '<div id="pong-statusbar">' +
        '<span class="pong-badge">WASM</span><span class="pong-badge">WebGL</span>' +
        '&nbsp; P1: <b>W A S D</b> &nbsp;·&nbsp; P2: <b>↑ ↓ ← →</b> &nbsp;·&nbsp; ' +
        '<b>P</b> pause &nbsp;·&nbsp; <b>Space/Enter</b> smash &nbsp;·&nbsp; <b>Esc</b> close' +
      '</div>';
    document.body.appendChild(w);
    $('pong-close').addEventListener('click', close);
    makeDraggable(w, $('pong-titlebar'));
  }

  /* ---------------- dragging by the titlebar --------------------------- */
  function makeDraggable(win, handle) {
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    handle.addEventListener('pointerdown', function (e) {
      if (e.target.id === 'pong-close') return;
      dragging = true;
      var r = win.getBoundingClientRect();
      // switch from translate-centering to absolute left/top on first drag
      win.style.left = r.left + 'px';
      win.style.top = r.top + 'px';
      win.style.transform = 'none';
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      win.style.left = (ox + e.clientX - sx) + 'px';
      win.style.top = (oy + e.clientY - sy) + 'px';
    });
    handle.addEventListener('pointerup', function (e) {
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    });
  }

  /* ---------------- terminal (xterm.js + WebGL renderer) --------------- */
  function makeTerminal() {
    $('pong-screen').innerHTML = '';        // drop any disposed terminal's DOM
    term = new Terminal({
      cols: COLS, rows: ROWS,
      fontFamily: '"Cascadia Mono", "Consolas", "DejaVu Sans Mono", monospace',
      fontSize: 9, lineHeight: 1.0,
      cursorBlink: false, scrollback: 0, disableStdin: false,
      theme: { background: '#0a0a0a', foreground: '#33ff33', cursor: '#0a0a0a' }
    });
    term.open($('pong-screen'));
    try {
      webglAddon = new WebglAddon.WebglAddon();
      webglAddon.onContextLoss(function () {
        try { webglAddon.dispose(); } catch (_) {}
      });
      term.loadAddon(webglAddon);          // <-- renders the terminal on WebGL
    } catch (e) {
      console.warn('[pong] WebGL renderer unavailable, using canvas fallback', e);
    }
    term.onData(onTermData);
    // xterm (and the WebGL canvas) settle their pixel size a few frames after
    // open(); re-fit whenever that happens so the window isn't clamped to one row.
    if (window.ResizeObserver) {
      new ResizeObserver(fitScale).observe(term.element);
    }
    fitScale();
  }

  // Line input for the menus' name/key prompts (replaces the game's scanf).
  function onTermData(d) {
    if (readResolver === null) return;     // ignore typing outside a prompt
    for (var i = 0; i < d.length; i++) {
      var ch = d[i];
      if (ch === '\r' || ch === '\n') {
        term.write('\r\n');
        var tok = (readBuf.trim().split(/\s+/)[0] || 'Player').slice(0, 11);
        readBuf = ''; var r = readResolver; readResolver = null; r(tok);
        return;
      } else if (ch === '\x7f' || ch === '\b') {
        if (readBuf.length) { readBuf = readBuf.slice(0, -1); term.write('\b \b'); }
      } else if (ch >= ' ' && readBuf.length < 11) {
        readBuf += ch; term.write(ch);
      }
    }
  }

  // Scale the fixed 210x54 grid to fit the viewport without changing cols/rows.
  function fitScale() {
    if (!term || !term.element) return;
    var natW = term.element.offsetWidth || COLS * 5.4;
    var natH = term.element.offsetHeight || ROWS * 11;
    var maxW = Math.min(window.innerWidth * 0.96, 1320);
    var maxH = window.innerHeight * 0.82;
    var s = Math.min(1, maxW / natW, maxH / natH);
    var scaler = $('pong-screen-scaler');
    scaler.style.width = natW + 'px';
    scaler.style.height = natH + 'px';
    scaler.style.transform = 'scale(' + s + ')';
    var body = $('pong-body');
    body.style.width = Math.ceil(natW * s) + 'px';
    body.style.height = Math.ceil(natH * s) + 'px';
  }

  /* ---------------- WASM boot ------------------------------------------ */
  // A fresh module is instantiated every time the window opens; the previous
  // one is told to exit on close. `gen` ties each module's I/O to its lifetime
  // so a dying instance can never write into the next game's terminal.
  function boot() {
    var gen = ++generation;
    PongModule({
      __quit: false,                       // set true on close -> binary exits
      locateFile: function (p) { return BASE + p; },
      termWrite: function (s) {
        if (opened && term && gen === generation) term.write(s);
      },
      readLine: function () {
        return new Promise(function (resolve) {
          if (gen !== generation) { resolve(''); return; }
          readBuf = ''; readResolver = resolve;
          if (term) term.focus();
        });
      },
      print: function () {},
      printErr: function (x) { console.warn('[pong]', x); }
    }).then(function (inst) {
      if (gen === generation) moduleInstance = inst;
      else { try { inst.__quit = true; } catch (e) {} }   // already closed
    }).catch(function (err) {
      console.error('[pong] failed to start', err);
      if (term && gen === generation) {
        term.write('\r\n\x1b[31m failed to load pong.wasm: ' + err + '\x1b[0m\r\n');
      }
    });
  }

  /* ---------------- keyboard (GetAsyncKeyState-style polling) ---------- */
  function setKey(code, down) {
    if (moduleInstance && moduleInstance._web_set_key) {
      moduleInstance._web_set_key(code & 0xff, down ? 1 : 0);
    }
  }
  function onKeyDown(e) {
    if (!opened) return;
    if (e.key === 'Escape') { close(); return; }
    if (readResolver !== null) return;     // let xterm collect typed input
    setKey(e.keyCode, true);
    if (GAME_KEYS[e.keyCode]) e.preventDefault();
  }
  function onKeyUp(e) {
    if (!opened || readResolver !== null) return;
    setKey(e.keyCode, false);
  }
  function attachKeys() {
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('resize', fitScale);
  }
  function detachKeys() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('resize', fitScale);
  }

  /* ---------------- public API ---------------------------------------- */
  function open() {
    buildWindow();
    $('pong-window').classList.add('active');
    opened = true;
    attachKeys();
    makeTerminal();   // fresh terminal every open
    boot();           // fresh binary, booted from the splash screen
    setTimeout(function () {
      fitScale();
      if (term) {
        term.refresh(0, term.rows - 1);    // repaint after reveal
        term.focus();
      }
    }, 60);
  }
  function close() {
    var w = $('pong-window');
    if (w) w.classList.remove('active');
    opened = false;
    detachKeys();
    // Tell the running binary to exit; unblock it if it's at a name prompt.
    if (moduleInstance) { try { moduleInstance.__quit = true; } catch (e) {} }
    if (readResolver) { var r = readResolver; readResolver = null; r(''); }
    if (term) { try { term.dispose(); } catch (e) {} term = null; }
    if (webglAddon) { try { webglAddon.dispose(); } catch (e) {} webglAddon = null; }
    moduleInstance = null;
    readBuf = '';
  }
  function toggle() { (opened ? close : open)(); }

  window.OsmanPong = { open: open, close: close, toggle: toggle };
})();
