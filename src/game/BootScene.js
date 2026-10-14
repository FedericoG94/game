import Phaser from 'phaser';

/** Prima scena: attende il font (così i testi nel canvas non compaiono con il carattere sbagliato) e passa al caricamento. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const go = () => this.scene.start('Preload');
    const fonts = document.fonts;
    if (!fonts?.load) {
      go();
      return;
    }
    const timeout = new Promise((resolve) => setTimeout(resolve, 1800));
    Promise.race([Promise.all([fonts.load('700 32px "Fredoka Variable"'), fonts.load('600 16px "Nunito Variable"')]), timeout])
      .catch(() => {})
      .then(go);
  }
}
