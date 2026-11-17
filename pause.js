'use strict';

// Menú de pausa. Se carga antes de game.js: solo usa globals de game.js dentro de funciones
// que se llaman más tarde (togglePause, init, etc.).

const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const controlsBtn = document.getElementById('controls-btn');
const pauseControls = document.getElementById('pause-controls');
const startLevelSelect = document.getElementById('start-level');

// Tras reanudar, se ignoran los keydown con auto-repeat hasta que llegue uno nuevo
let ignoreRepeat = false;

function getStartLevel() {
  let n = 1;
  try { n = parseInt(localStorage.getItem('startLevel'), 10); } catch (e) {}
  return n >= 1 && n <= 10 ? n : 1;
}

function levelInterval(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

function showPauseMenu() {
  startLevelSelect.value = String(getStartLevel());
  pauseControls.classList.add('hidden');
  controlsBtn.setAttribute('aria-expanded', 'false');
  pauseMenu.classList.remove('hidden');
  resumeBtn.focus();
}

function hidePauseMenu() {
  pauseMenu.classList.add('hidden');
  ignoreRepeat = true;
}

for (let i = 1; i <= 10; i++) {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = i;
  startLevelSelect.appendChild(opt);
}

resumeBtn.addEventListener('click', () => { resumeBtn.blur(); togglePause(); });

pauseRestartBtn.addEventListener('click', () => {
  pauseRestartBtn.blur();
  pauseMenu.classList.add('hidden');
  ignoreRepeat = true;
  init();
});

controlsBtn.addEventListener('click', () => {
  const hidden = pauseControls.classList.toggle('hidden');
  controlsBtn.setAttribute('aria-expanded', String(!hidden));
  controlsBtn.blur();
});

startLevelSelect.addEventListener('change', () => {
  try { localStorage.setItem('startLevel', startLevelSelect.value); } catch (e) {}
  // Se aplica en el siguiente Reiniciar; el foco sale del select para que Space/flechas no lo cambien
  startLevelSelect.blur();
});

document.addEventListener('keyup', () => { ignoreRepeat = false; });
