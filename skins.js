'use strict';

// Skins visuales. Cargado antes de game.js: aquí solo se definen datos y funciones;
// los globals de game.js (p. ej. `theme`) se usan únicamente dentro de drawBlock,
// que se llama después de que game.js haya cargado.
// Cada skin: name (etiqueta en español), colors (índices 1-9, como COLORS en game.js),
// background / grid opcionales (null = usar el tema claro/oscuro) y
// drawBlock(context, px, py, size, color, alpha) con coordenadas en píxeles.

function roundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

const SKINS = {
  retro: {
    name: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#90caf9', '#ffb74d', '#b0bec5', '#ff5252'],
    background: null,
    grid: null,
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      context.fillStyle = theme.highlight;
      context.fillRect(px + 1, py + 1, size - 2, 4);
      // borde (solo visible en tema claro, para dar contraste)
      context.strokeStyle = theme.blockBorder;
      context.lineWidth = 1;
      context.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);
      context.globalAlpha = 1;
    },
  },

  neon: {
    name: 'Neon',
    colors: [null, '#00f0ff', '#fff200', '#d400ff', '#39ff14', '#ff2079', '#4d7cff', '#ff9500', '#c0d0ff', '#ff3030'],
    background: '#000',
    grid: '#1a1a2a',
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + 3, py + 3, size - 6, size - 6);
      context.shadowBlur = 0;
      context.globalAlpha = alpha * 0.35;
      context.fillStyle = color;
      context.fillRect(px + 4, py + 4, size - 8, size - 8);
      context.shadowColor = 'transparent';
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    },
  },

  pastel: {
    name: 'Pastel',
    colors: [null, '#a8e6ef', '#fff1b8', '#d9b8ee', '#b9e8c0', '#f5b8b8', '#b8d8f8', '#fcd5a5', '#cfd8dc', '#ff8a80'],
    background: null,
    grid: null,
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.fillStyle = color;
      roundedRectPath(context, px + 2, py + 2, size - 4, size - 4, 8);
      context.fill();
      // brillo suave
      context.fillStyle = 'rgba(255,255,255,0.45)';
      roundedRectPath(context, px + 6, py + 5, size - 12, 4, 2);
      context.fill();
      context.strokeStyle = 'rgba(0,0,0,0.12)';
      context.lineWidth = 1;
      roundedRectPath(context, px + 2.5, py + 2.5, size - 5, size - 5, 8);
      context.stroke();
      context.globalAlpha = 1;
    },
  },

  pixel: {
    name: 'Pixel art',
    colors: [null, '#29b6f6', '#fdd835', '#9c27b0', '#43a047', '#e53935', '#3f51b5', '#fb8c00', '#78909c', '#ff1744'],
    background: null,
    grid: null,
    drawBlock(context, px, py, size, color, alpha) {
      const p = Math.max(2, Math.round(size / 6)); // tamaño del "píxel"
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      // tablero de ajedrez interior
      const n = Math.floor((size - 2) / p);
      context.fillStyle = 'rgba(255,255,255,0.14)';
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if ((i + j) % 2) continue;
          context.fillRect(px + 1 + i * p, py + 1 + j * p, p, p);
        }
      }
      // bisel: luz arriba/izquierda, sombra abajo/derecha
      context.fillStyle = 'rgba(255,255,255,0.45)';
      context.fillRect(px + 1, py + 1, size - 2, p / 2);
      context.fillRect(px + 1, py + 1, p / 2, size - 2);
      context.fillStyle = 'rgba(0,0,0,0.4)';
      context.fillRect(px + 1, py + size - 1 - p / 2, size - 2, p / 2);
      context.fillRect(px + size - 1 - p / 2, py + 1, p / 2, size - 2);
      context.strokeStyle = '#000';
      context.lineWidth = 1;
      context.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
      context.globalAlpha = 1;
    },
  },
};
