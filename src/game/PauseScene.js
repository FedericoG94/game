import Phaser from 'phaser';
import { app } from './app.js';

/**
 * Pausa: la corsa resta congelata sotto (la scena Runner è in pausa, quindi tempo,
 * spawn, punteggio e animazioni si fermano) e qui compare il menu HTML.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    this.panel = app.ui.showPause({
      onResume: () => this.resume(),
      onRestart: () => this.restart(),
      onMenu: () => this.toMenu(),
    });
    // Esc: se è aperta una conferma, la annulla; altrimenti riprende il gioco
    this.unsubscribe = app.input.on('pause', () => {
      if (this.panel.isConfirming()) this.panel.backToMain();
      else this.resume();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  resume() {
    this.scene.resume('Runner');
    this.scene.stop();
  }

  restart() {
    this.scene.stop('GiftReveal');
    app.audio.resume();
    this.scene.start('Runner');
  }

  toMenu() {
    this.scene.stop('GiftReveal');
    this.scene.stop('Runner');
    app.audio.resume();
    this.scene.start('Menu');
  }

  cleanup() {
    this.unsubscribe?.();
    this.panel?.close();
  }
}
