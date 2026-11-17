'use strict';

// Tabla de records local (localStorage['records']).
// Formato: { top: [{name, score, lines, combo, date}] (máx. 5, orden desc), bestCombo, maxLines }
// Solo se llama desde game.js dentro de funciones; no toca globales de game.js al cargar.
const RECORDS_KEY = 'records';
const MAX_RECORDS = 5;
const MAX_NAME_LEN = 12;

function emptyRecords() {
  return { top: [], bestCombo: 0, maxLines: 0 };
}

function nonNegInt(v) {
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

function loadRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (!data || typeof data !== 'object' || !Array.isArray(data.top)) return emptyRecords();
    const top = data.top
      .filter(e => e && typeof e === 'object')
      .map(e => ({
        name: String(e.name ?? 'Jugador').slice(0, MAX_NAME_LEN) || 'Jugador',
        score: nonNegInt(e.score),
        lines: nonNegInt(e.lines),
        combo: nonNegInt(e.combo),
        date: typeof e.date === 'string' ? e.date : '',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RECORDS);
    return { top, bestCombo: nonNegInt(data.bestCombo), maxLines: nonNegInt(data.maxLines) };
  } catch (e) {
    return emptyRecords();
  }
}

function saveRecords(rec) {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(rec)); } catch (e) {}
}

function clearRecords() {
  try { localStorage.removeItem(RECORDS_KEY); } catch (e) {}
}

function scoreQualifies(rec, score) {
  if (score <= 0) return false;
  return rec.top.length < MAX_RECORDS || score > rec.top[rec.top.length - 1].score;
}

// Inserta la entrada y devuelve su índice en la tabla (o -1 si quedó fuera).
function insertRecord(rec, entry) {
  let idx = rec.top.findIndex(e => entry.score > e.score);
  if (idx === -1) idx = rec.top.length;
  rec.top.splice(idx, 0, entry);
  rec.top.length = Math.min(rec.top.length, MAX_RECORDS);
  return idx < MAX_RECORDS ? idx : -1;
}

// Rellena `table` (un <table>) usando solo textContent.
function renderRecordsTable(table, rec, highlightIdx) {
  table.replaceChildren();
  const head = table.createTHead().insertRow();
  ['#', 'Nombre', 'Puntos', 'Líneas', 'Combo'].forEach(t => {
    const th = document.createElement('th');
    th.textContent = t;
    head.appendChild(th);
  });
  const body = table.createTBody();
  if (!rec.top.length) {
    const td = body.insertRow().insertCell();
    td.colSpan = 5;
    td.className = 'records-empty';
    td.textContent = 'Aún no hay records';
    return;
  }
  rec.top.forEach((e, i) => {
    const tr = body.insertRow();
    if (i === highlightIdx) tr.className = 'records-new';
    [i + 1, e.name, e.score.toLocaleString(), e.lines, e.combo].forEach(v => {
      tr.insertCell().textContent = v;
    });
  });
}
