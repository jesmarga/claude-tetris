# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris in vanilla JavaScript + HTML5 Canvas + CSS. No dependencies, no `package.json`, no bundler/transpiler, no linter, no test suite. User-facing text (README, UI labels, overlay messages) is in Spanish — keep it that way.

## Running

Open `index.html` directly, or serve the folder statically (preferred):

    python -m http.server 8000      # then http://localhost:8000
    npx serve .

There is nothing to build or test; verify changes by playing in the browser.

## Architecture

- `index.html` defines the DOM that `game.js` grabs by id at load time: `board`, `next-canvas`, `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`, `theme-toggle`. Renaming an id requires updating both files. `game.js` is loaded with a plain `<script>` at the end of `<body>` (not a module), so everything lives in global script scope.
- **Canvas size is coupled to constants**: `<canvas id="board">` width/height must equal `COLS × BLOCK` by `ROWS × BLOCK` (300×600 by default). The next-piece canvas is 120×120, matching the hardcoded 4×4 grid × `NB = 30` in `drawNext()`.
- **Piece/color indexing**: `PIECES[i]` and `COLORS[i]` share index 1–8 (index 0 is `null`; 8 is the 3×3 "tuerca" challenge piece with an empty center). `randomPiece()` picks uniformly from `PIECES.length - 2` (1–8; the bomb is excluded). Each shape matrix stores its own type index as the cell value, and the board stores those same indices (0 = empty), so a cell's value is directly its color index.
- **Bomba (power-up)**: índice 9 (`BOMB`, `PIECES[9] = [[9]]`). `randomPiece()` la saca con `BOMB_CHANCE` aparte del sorteo uniforme 1–8. En `lockPiece()` llama a `explode()` en vez de `merge()`, así que el 9 nunca se guarda en el tablero.
- **State** is a set of module-level `let` variables (`board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId`), all (re)initialized in `init()`, which is also the restart handler.
- **Game loop**: `loop()` runs on `requestAnimationFrame`, accumulates `dt` into `dropAccum`, and steps gravity when it exceeds `dropInterval`. Pause and game over stop the loop via `cancelAnimationFrame(animId)`; unpausing restarts it by calling `loop()` directly.
- **Piece lifecycle**: any landing (gravity, `softDrop`, `hardDrop`) goes through `lockPiece()` → `merge()` → `clearLines()` → `spawn()`. Game over is detected only in `spawn()`, when the freshly spawned piece already collides.
- `collide(shape, x, y)` is the single source of truth for movement validity; rows with `y < 0` are allowed (above the board). Rotation (`tryRotate`) is a clockwise transpose (`rotateCW`) plus simple horizontal kicks `[0, -1, 1, -2, 2]`, not SRS.
- **Scoring/levels** live in `clearLines()`: `LINE_SCORES[cleared] × level`, level = `floor(lines / 10) + 1`, `dropInterval = max(100, 1000 − (level − 1) × 90)`. Soft drop +1 per row, hard drop +2 per row. HUD is refreshed via `updateHUD()`.
- **Temas (claro/oscuro)**: los colores de la UI son variables CSS en `:root` (oscuro por defecto) y `:root[data-theme="light"]` en `style.css`. Un script inline en `<head>` aplica el tema guardado (`localStorage['theme']`) antes del primer render. `applyTheme(name)` en `game.js` fija `data-theme`, lee de CSS las variables que usa el canvas (`--grid-color`, `--block-highlight`, `--block-border`) en el objeto `theme`, actualiza el botón y llama a `draw()`/`drawNext()` (el canvas solo se redibuja en `loop()`, que se detiene en pausa/game over). Los colores del canvas deben salir de `theme`, no de literales. El botón hace `blur()` tras el clic para que Space no lo active.
- Rendering: `draw()` redraws grid → locked board → ghost piece (alpha 0.2, from `ghostY()`) → current piece every frame; `drawNext()` only redraws on `spawn()`.
- **Records locales** (`records.js`, cargado con `<script>` antes de `game.js`): `localStorage['records']` = `{ top: [{name, score, lines, combo, date}] (máx. 5, orden desc), bestCombo, maxLines }`. `loadRecords()` valida y sanea el JSON (try/catch); `saveRecords`, `clearRecords`, `scoreQualifies`, `insertRecord` y `renderRecordsTable` (solo `textContent`) son funciones globales que `game.js` llama en tiempo de ejecución. **Combo** = locks consecutivos que limpian ≥1 línea (`combo`/`maxCombo`, se actualizan en `lockPiece()` con el retorno de `clearLines()` y se reinician en `init()`). La partida **no arranca sola**: al cargar, `game.js` pone `gameOver = true` y llama a `showStartScreen()` (título, tabla, botón Jugar; Enter también inicia). `endGame()` actualiza `bestCombo`/`maxLines`, y si la puntuación entra en el top 5 muestra el formulario de nombre (`#name-form`, maxlength 12) y `saveName()` resalta la fila nueva. `#clear-records-btn` borra con `confirm()`. El `keydown` global ignora eventos cuyo objetivo es un `input`. Ids nuevos: `records-note`, `name-form`, `name-input`, `records-view`, `records-table`, `records-stats`, `clear-records-btn`.
