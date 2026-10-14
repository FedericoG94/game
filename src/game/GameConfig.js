import Phaser from 'phaser';
import { BootScene } from './BootScene.js';
import { PreloadScene } from './PreloadScene.js';
import { MenuScene } from './MenuScene.js';
import { RunnerScene } from './RunnerScene.js';
import { GiftRevealScene } from './GiftRevealScene.js';
import { PauseScene } from './PauseScene.js';
import { FinalScene } from './FinalScene.js';

/** Pixel totali massimi del canvas: oltre si riduce la risoluzione interna per restare fluidi su smartphone. */
const MAX_PIXELS = 3_000_000;

/**
 * Dimensioni del canvas: riempie la finestra (CSS px) e usa una risoluzione interna
 * pari al rapporto pixel del dispositivo, limitata per le prestazioni.
 */
export function canvasMetrics(maxPixelRatio = 2) {
  const vv = window.visualViewport;
  const cssW = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
  const cssH = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
  let ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
  ratio = Math.min(ratio, Math.sqrt(MAX_PIXELS / (cssW * cssH)));
  ratio = Math.max(0.75, ratio);
  return { cssW, cssH, ratio, width: Math.round(cssW * ratio), height: Math.round(cssH * ratio) };
}

export function createGameConfig(metrics) {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: metrics.width,
    height: metrics.height,
    backgroundColor: '#2a1a5e',
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / metrics.ratio },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
      // mipmap: gli oggetti lontani, molto rimpiccioliti, non sfarfallano (le texture sono cotte a potenza di due)
      mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    },
    // L'input (tastiera, swipe, pulsanti) è gestito dal DOM: Phaser non intercetta nulla.
    input: { mouse: false, touch: false, keyboard: false, gamepad: false },
    // L'audio è sintetizzato con Web Audio da `audio.js`.
    audio: { noAudio: true },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, PreloadScene, MenuScene, RunnerScene, GiftRevealScene, PauseScene, FinalScene],
  };
}

/** Ridimensiona il canvas ai nuovi pixel della finestra mantenendo nitida la risoluzione interna. */
export function resizeGame(game, maxPixelRatio) {
  const m = canvasMetrics(maxPixelRatio);
  const { scale } = game;
  const unchanged = scale.width === m.width && scale.height === m.height && Math.abs(scale.zoom - 1 / m.ratio) < 1e-6;
  if (!unchanged) {
    scale.setZoom(1 / m.ratio);
    scale.resize(m.width, m.height);
  }
  const { style } = game.canvas;
  style.width = `${m.cssW}px`;
  style.height = `${m.cssH}px`;
  return m;
}
