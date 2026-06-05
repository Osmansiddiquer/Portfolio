# OSMAN.SYS — Terminal Portfolio

A retro terminal–themed personal portfolio for **Osman Siddique**, rendered entirely
in the browser. Boot sequence, matrix rain, theme switcher, CRT vibes, a hidden Snake
game, the Konami code, and a talking pixel avatar — all in plain HTML/CSS/JS, no build step.

🔗 **Live:** https://osmansiddiquer.github.io/Portfolio/

## ▶ Pong, compiled to WebAssembly

The standout feature: my old console [Pong](https://github.com/Osmansiddiquer/pong)
(written in plain C against the Windows console API) **runs inside the site**.

The C is compiled to WebAssembly with Emscripten and rendered live on an
[xterm.js](https://xtermjs.org/) terminal using its **WebGL renderer**. The Windows
platform layer was ported to the browser:

- console cursor/colour APIs → ANSI escape sequences
- `GetAsyncKeyState` polling → a key-state table fed by browser keyboard events
- `clock()` → wall-clock timing; blocking game loops → cooperative `emscripten_sleep` yields (ASYNCIFY)
- save/resume data persists to `localStorage` (the site treats it as the OS filesystem)

Open it from the **Pong** project card on the page.

### Rebuilding the WASM

The compiled artifacts (`assets/pong/pong.js`, `assets/pong/pong.wasm`) are committed,
so the site runs as-is. To rebuild from the C sources in [`pong-src/web/`](pong-src/web):

```bash
# requires Emscripten (used here via the emscripten/emsdk Docker image)
cd pong-src/web
emcc # ...see build.sh
bash build.sh
# then copy pong.js + pong.wasm into assets/pong/
```

## Project layout

```
index.html              # the page
styles.css              # all styles
script.js               # boot, matrix, themes, snake, konami, avatar
bg.mp3                  # background music
assets/pong/            # WASM Pong runtime + vendored xterm.js (+ WebGL addon)
pong-src/               # original C Pong + the web-ported sources used for the build
.github/workflows/      # GitHub Pages deploy
```

## Deployment

Pushed to `main` → a GitHub Actions workflow publishes the static site to **GitHub Pages**.
