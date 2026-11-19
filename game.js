'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - azul pálido
  '#ffb74d', // L - orange
  '#b0bec5', // Tuerca - gris acero
  '#ff5252', // Bomba - mecha/chispa
];

const BOMB = 9;
const BOMB_CHANCE = 0.1;
const BOMB_BLOCK_SCORE = 10;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // Tuerca (reto: hueco central)
  [[9]],                                       // Bomba (power-up, nunca se guarda en el tablero)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');

const themeToggle = document.getElementById('theme-toggle');

const recordForm = document.getElementById('record-form');
const recordRankEl = document.getElementById('record-rank');
const playerName = document.getElementById('player-name');
const recordsBody = document.getElementById('records-body');
const recordStats = document.getElementById('record-stats');
const resetRecordsBtn = document.getElementById('reset-records-btn');

// ---- Records (localStorage) ----
const RECORDS_KEY = 'records';
const MAX_RECORDS = 5;
const MAX_NAME = 12;

function loadRecords() {
  const empty = { scores: [], bestCombo: 0, maxLines: 0 };
  try {
    const d = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (!d || typeof d !== 'object') return empty;
    const scores = Array.isArray(d.scores)
      ? d.scores
          .filter(s => s && typeof s.name === 'string' && Number.isFinite(s.score))
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_RECORDS)
      : [];
    return { scores, bestCombo: Number(d.bestCombo) || 0, maxLines: Number(d.maxLines) || 0 };
  } catch (e) {
    return empty;
  }
}

function saveRecords() {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); } catch (e) {}
}

// Posición (0-based) que ocuparía una puntuación en el top, o -1 si no entra
function recordRank(s) {
  if (s <= 0) return -1;
  const i = records.scores.findIndex(r => s > r.score);
  if (i !== -1) return i;
  return records.scores.length < MAX_RECORDS ? records.scores.length : -1;
}

function renderRecords() {
  const rows = records.scores.map(s => ({ name: s.name, score: s.score, hl: s === lastSaved }));
  if (pendingRank >= 0) rows.splice(pendingRank, 0, { name: '…', score, hl: true });
  recordsBody.replaceChildren();
  if (!rows.length) {
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'empty';
    td.textContent = 'Sin records todavía';
    recordsBody.appendChild(document.createElement('tr')).appendChild(td);
  }
  rows.slice(0, MAX_RECORDS).forEach((row, i) => {
    const tr = recordsBody.appendChild(document.createElement('tr'));
    if (row.hl) tr.className = 'highlight';
    [i + 1, row.name, row.score.toLocaleString()].forEach(text => {
      tr.appendChild(document.createElement('td')).textContent = text;
    });
  });
  recordStats.textContent = `Mejor combo: ${records.bestCombo} · Líneas máx.: ${records.maxLines}`;
}

function savePending() {
  if (pendingRank < 0) return;
  const entry = { name: playerName.value.trim().slice(0, MAX_NAME) || 'Anónimo', score, lines };
  records.scores.splice(pendingRank, 0, entry);
  records.scores.length = Math.min(records.scores.length, MAX_RECORDS);
  lastSaved = entry;
  pendingRank = -1;
  recordForm.hidden = true;
  saveRecords();
  renderRecords();
}

function showOverlay(mode, title, subtitle) {
  overlay.dataset.mode = mode;
  overlayTitle.textContent = title;
  overlayScore.textContent = subtitle;
  restartBtn.textContent = mode === 'start' ? 'Jugar' : 'Reiniciar';
  overlay.classList.remove('hidden');
}

// Colores del canvas leídos de las variables CSS (ver applyTheme)
const theme = { grid: '#22222e', highlight: 'rgba(255,255,255,0.12)', blockBorder: 'transparent', bombBody: '#222' };

function applyTheme(name) {
  const isLight = name === 'light';
  if (isLight) document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  const css = getComputedStyle(document.documentElement);
  theme.grid = css.getPropertyValue('--grid-color').trim();
  theme.highlight = css.getPropertyValue('--block-highlight').trim();
  theme.blockBorder = css.getPropertyValue('--block-border').trim();
  theme.bombBody = css.getPropertyValue('--bomb-body').trim() || theme.bombBody;
  themeToggle.textContent = isLight ? 'Modo oscuro' : 'Modo claro';
  themeToggle.setAttribute('aria-pressed', String(isLight));
  themeToggle.setAttribute('aria-label', isLight ? 'Activar modo oscuro' : 'Activar modo claro');
  // El canvas solo se redibuja en loop(); forzar redibujado (pausa / game over)
  if (current && next) { draw(); drawNext(); }
}

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
// Combo = piezas consecutivas que completan línea(s); started = false en la pantalla de inicio
let combo, maxCombo, started = false;
let records = loadRecords();
let pendingRank = -1; // puesto pendiente de guardar al terminar la partida (-1 = ninguno)
let lastSaved = null; // entrada recién guardada, para resaltarla en la tabla

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  // La bomba sale por probabilidad aparte; el resto (1..8) es uniforme
  const type = Math.random() < BOMB_CHANCE
    ? BOMB
    : Math.floor(Math.random() * (PIECES.length - 2)) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function explode(cx, cy) {
  let destroyed = 0;
  for (let r = cy - 1; r <= cy + 1; r++) {
    for (let c = cx - 1; c <= cx + 1; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (board[r][c]) { board[r][c] = 0; destroyed++; }
    }
  }
  score += destroyed * BOMB_BLOCK_SCORE * level;
  updateHUD();
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  if (current.type === BOMB) explode(current.x, current.y);
  else merge();
  combo = clearLines() ? combo + 1 : 0;
  maxCombo = Math.max(maxCombo, combo);
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  if (colorIndex === BOMB) {
    const cx = x * size + size / 2, cy = y * size + size / 2 + 2;
    context.fillStyle = theme.bombBody;
    context.beginPath();
    context.arc(cx, cy, size / 2 - 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
    // mecha y chispa
    context.beginPath();
    context.moveTo(cx + 4, cy - size / 2 + 5);
    context.lineTo(cx + 8, cy - size / 2 + 1);
    context.stroke();
    context.fillStyle = color;
    context.fillRect(cx + 7, cy - size / 2 - 1, 4, 4);
    context.globalAlpha = 1;
    return;
  }
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = theme.highlight;
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  // borde (solo visible en tema claro, para dar contraste a los colores pastel)
  context.strokeStyle = theme.blockBorder;
  context.lineWidth = 1;
  context.strokeRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  records.maxLines = Math.max(records.maxLines, lines);
  records.bestCombo = Math.max(records.bestCombo, maxCombo);
  saveRecords();
  pendingRank = recordRank(score);
  lastSaved = null;
  recordForm.hidden = pendingRank < 0;
  if (pendingRank >= 0) recordRankEl.textContent = pendingRank + 1;
  renderRecords();
  showOverlay('gameover', 'GAME OVER', `Puntuación: ${score.toLocaleString()}`);
  if (pendingRank >= 0) {
    playerName.value = '';
    playerName.focus();
  }
}

function togglePause() {
  if (gameOver || !started) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    showOverlay('pause', 'PAUSA', '');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
      if (gameOver) { draw(); return; } // no re-armar el bucle tras endGame()
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  started = true;
  combo = 0;
  maxCombo = 0;
  pendingRank = -1;
  lastSaved = null;
  recordForm.hidden = true;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (!started || paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => {
  savePending(); // no perder un récord pendiente si se reinicia sin pulsar Guardar
  init();
  restartBtn.blur(); // evita que Space reactive el botón durante la partida
});

recordForm.addEventListener('submit', e => {
  e.preventDefault();
  savePending();
});

resetRecordsBtn.addEventListener('click', () => {
  if (!confirm('¿Borrar todos los records?')) return;
  records = { scores: [], bestCombo: 0, maxLines: 0 };
  pendingRank = recordRank(gameOver ? score : 0);
  lastSaved = null;
  recordForm.hidden = pendingRank < 0 || !gameOver;
  if (recordForm.hidden) pendingRank = -1;
  else recordRankEl.textContent = pendingRank + 1;
  saveRecords();
  renderRecords();
  resetRecordsBtn.blur();
});

themeToggle.addEventListener('click', () => {
  const isLight = document.documentElement.dataset.theme === 'light';
  const newTheme = isLight ? 'dark' : 'light';
  try { localStorage.setItem('theme', newTheme); } catch (e) {}
  applyTheme(newTheme);
  themeToggle.blur(); // evita que Space dispare el botón y hardDrop() a la vez
});

applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

// Pantalla de inicio: estado listo pero sin arrancar el bucle hasta pulsar "Jugar"
init();
cancelAnimationFrame(animId);
started = false;
draw();
renderRecords();
showOverlay('start', 'TETRIS', 'Records locales');
