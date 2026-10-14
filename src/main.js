import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './styles/main.css';
import Phaser from 'phaser';
import { app } from './game/app.js';
import { canvasMetrics, createGameConfig, resizeGame } from './game/GameConfig.js';
import { createOverlay } from './ui/overlay.js';
import { Hud } from './ui/hud.js';
import { attachSwipe, createTouchButtons } from './ui/touchControls.js';
import { h } from './ui/dom.js';

const SWIPE_ACTIONS = { left: 'left', right: 'right', up: 'jump', down: 'slide' };

function mountInterface() {
  const root = document.getElementById('ui');

  // Superficie degli swipe: sotto HUD e pulsanti, attiva solo durante la corsa.
  const zone = h('div', { class: 'touch-zone' });
  root.append(zone);
  app.touchZone = zone;
  app.swipe = attachSwipe(zone, (dir) => app.input.emit(SWIPE_ACTIONS[dir]));

  app.hud = new Hud(root, {
    onPause: () => {
      if (!app.swipe.justSwiped()) app.input.emit('pause');
    },
  });

  app.touchButtons = createTouchButtons((action) => app.input.emit(action));
  root.append(app.touchButtons);
  app.ui = createOverlay(root, app);
}

function start() {
  mountInterface();
  const metrics = canvasMetrics(app.settings.quality.maxPixelRatio);
  const game = new Phaser.Game(createGameConfig(metrics));
  app.game = game;

  // Il canvas segue la finestra (anche rotazione e barra del browser dei telefoni).
  let pending = 0;
  const onResize = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => resizeGame(game, app.settings.quality.maxPixelRatio));
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  game.events.once(Phaser.Core.Events.READY, () => resizeGame(game, app.settings.quality.maxPixelRatio));

  // Audio fermo quando la scheda non è visibile.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) app.audio.suspend();
    else if (!game.scene.isPaused('Runner')) app.audio.resume();
  });

  // Strumenti di diagnosi per sviluppo e test (non influiscono sul gioco).
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) window.__game = { game, app };
}

start();
