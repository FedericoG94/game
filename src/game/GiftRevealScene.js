import Phaser from 'phaser';
import { app } from './app.js';
import { artMeta, makeArt } from './artBank.js';
import { Fx } from './Fx.js';

const MAX_CONCURRENT = 3;
const LID_SPLIT = 116; // altezza (unità) a cui il pacco viene "tagliato" in coperchio e base

/**
 * Scena sovrapposta al gioco che rappresenta l'apertura di un pacco nel mondo:
 * il coperchio salta via, scoppia la luce, la foto spunta dal pacco e vola verso la scheda
 * della sorpresa. Non ferma il gioco: lavora in parallelo e si ripulisce da sola.
 */
export class GiftRevealScene extends Phaser.Scene {
  constructor() {
    super('GiftReveal');
    this.live = [];
  }

  create() {
    this.fx = new Fx(this, {
      quality: app.quality,
      reducedMotion: app.reducedMotion,
      particleScale: app.settings.quality.particles,
    });
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  onResize() {
    this.fx?.resize();
  }

  /**
   * @param {{gift:object, x:number, y:number, footY:number, boxScale:number, boxKey:string, color:number, card?:{x:number,y:number,size:number}}} d
   * Le coordinate sono in pixel del canvas; `boxScale` è la scala dello sprite del pacco.
   */
  play(d) {
    if (!this.sys?.isActive() && !this.sys?.isPaused()) return;
    while (this.live.length >= MAX_CONCURRENT) this.live.shift().destroy();
    const { gift } = d;
    const positive = gift.type === 'positive';
    const reduced = app.reducedMotion;
    const group = this.add.container(0, 0).setDepth(1500);
    this.live.push(group);
    const finish = () => {
      const i = this.live.indexOf(group);
      if (i >= 0) this.live.splice(i, 1);
      group.destroy();
    };

    const m = artMeta(d.boxKey);
    const unit = d.boxScale * m.scale; // pixel per unità di disegno
    const footX = d.x;
    const footY = d.footY;

    // luce di fondo e raggi
    const tintColor = positive ? d.color : 0x7a4aff;
    const glow = makeArt(this, 'fx-glow', d.x, d.y, 1).setBlendMode(Phaser.BlendModes.ADD).setTint(tintColor).setAlpha(0);
    const glowS = (unit * 200 * 3.4) / 256 / artMeta('fx-glow').scale;
    glow.setScale(glowS * 0.3);
    group.add(glow);
    this.tweens.add({ targets: glow, scale: glowS, alpha: { from: 0.85, to: 0 }, duration: 620, ease: 'Cubic.Out' });
    if (positive && !reduced) {
      const rays = makeArt(this, 'fx-rays', d.x, d.y, 1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff1b0).setAlpha(0.6);
      const raysS = (unit * 200 * (gift.rarity === 'rare' ? 4.6 : 3.4)) / 512 / artMeta('fx-rays').scale;
      rays.setScale(raysS * 0.4);
      group.add(rays);
      this.tweens.add({ targets: rays, scale: raysS, rotation: 1.2, alpha: 0, duration: 800, ease: 'Sine.Out' });
    }

    // base del pacco (parte bassa della texture)
    const base = this.add.image(footX, footY, d.boxKey).setOrigin(m.origin[0], m.origin[1]).setScale(d.boxScale);
    base.setCrop(0, LID_SPLIT * m.scale, m.w * m.scale, (m.h - LID_SPLIT) * m.scale);
    group.add(base);
    this.tweens.add({ targets: base, scaleX: d.boxScale * 1.18, scaleY: d.boxScale * 0.82, duration: 90, yoyo: true, ease: 'Sine.Out' });
    this.tweens.add({ targets: base, alpha: 0, delay: 260, duration: 260, onComplete: () => base.destroy() });

    // coperchio (parte alta) che salta via
    const lidPivotY = 95;
    const lid = this.add.image(footX, footY - (188 - lidPivotY) * unit, d.boxKey).setOrigin(0.5, lidPivotY / 200).setScale(d.boxScale);
    lid.setCrop(0, 0, m.w * m.scale, LID_SPLIT * m.scale);
    group.add(lid);
    this.tweens.add({
      targets: lid,
      y: lid.y - unit * 260,
      x: lid.x + (Math.random() < 0.5 ? -1 : 1) * unit * 70,
      rotation: (Math.random() < 0.5 ? -1 : 1) * 3.4,
      alpha: 0,
      scale: d.boxScale * 1.15,
      duration: positive ? 640 : 540,
      ease: 'Cubic.Out',
      onComplete: () => lid.destroy(),
    });

    // foto che spunta dal pacco
    const size = Math.min(this.scale.width, this.scale.height) * 0.2;
    const photo = this.makePhoto(gift, size, positive);
    photo.setPosition(d.x, d.y).setScale(0.05).setAlpha(0);
    group.add(photo);
    // sopra la testa della protagonista (circa 1.4 volte l'altezza del pacco sopra i piedi)
    const apex = { x: d.x, y: footY - unit * 330 };
    this.tweens.add({ targets: photo, scale: 1, alpha: 1, x: apex.x, y: apex.y, duration: 330, ease: 'Back.Out' });
    if (!positive && !reduced) {
      this.tweens.add({ targets: photo, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 5, delay: 330 });
    } else if (!reduced) {
      this.tweens.add({ targets: photo, angle: { from: -4, to: 4 }, duration: 160, yoyo: true, repeat: 2, delay: 330, ease: 'Sine.InOut' });
    }
    // poi vola verso la scheda in alto e svanisce
    const target = d.card ?? { x: this.scale.width / 2 - this.scale.width * 0.3, y: this.scale.height * 0.18, size: size * 0.5 };
    this.tweens.add({
      targets: photo,
      x: target.x,
      y: target.y,
      scale: Math.max(0.2, target.size / size),
      alpha: 0,
      delay: 700,
      duration: 360,
      ease: 'Cubic.In',
      onComplete: finish,
    });

    // effetti di particelle e fumo
    this.fx.play(gift.effect, d.x, d.y - unit * 60);
    if (!positive) this.fx.play('smoke', d.x, d.y - unit * 20);
    return group;
  }

  /** Foto con cornice "polaroid"; se la texture manca usa il segnaposto già generato. */
  makePhoto(gift, size, positive) {
    const key = `gift-${gift.id}`;
    const pad = size * 0.045;
    const frame = this.add.graphics();
    const frameColor = positive ? (gift.rarity === 'rare' ? 0xffc928 : 0xffffff) : 0xe9dcff;
    frame.fillStyle(0x2a1245, 0.35);
    frame.fillRoundedRect(-size / 2 - pad + 4, -size / 2 - pad + 8, size + pad * 2, size + pad * 2, size * 0.06);
    frame.fillStyle(frameColor, 1);
    frame.fillRoundedRect(-size / 2 - pad, -size / 2 - pad, size + pad * 2, size + pad * 2, size * 0.06);
    frame.lineStyle(Math.max(2, size * 0.015), 0x2a1245, 1);
    frame.strokeRoundedRect(-size / 2 - pad, -size / 2 - pad, size + pad * 2, size + pad * 2, size * 0.06);
    const container = this.add.container(0, 0, [frame]);
    if (this.textures.exists(key)) {
      const img = this.add.image(0, 0, key);
      img.setScale(size / Math.max(img.width, img.height));
      container.add(img);
    }
    return container;
  }

  cleanup() {
    this.scale.off('resize', this.onResize, this);
    for (const g of this.live) g.destroy();
    this.live.length = 0;
    this.fx?.destroy();
    this.fx = null;
  }
}
