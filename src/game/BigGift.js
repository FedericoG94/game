import Phaser from 'phaser';
import { artMeta, makeArt } from './artBank.js';

const UNITS_PER_LANE = 5.2; // larghezza della texture (200 unità) in corsie a scala 1
const LID_PIVOT_Y = 95;
const BOW_PIVOT_Y = 60;
const FOOT_Y = 188;

/**
 * Il grande regalo finale, composto da pezzi sovrapponibili (corpo, nastro, coperchio, fiocco)
 * più luce e raggi. Lo stato animabile vive in `state`: le scene lo modificano con i tween
 * (apertura, scossa, fiocco che vola via…) e `place()` lo applica a ogni frame.
 */
export class BigGift {
  constructor(scene) {
    this.scene = scene;
    this.shadow = makeArt(scene, 'fx-shadow', 0, 0, 1);
    this.rays = makeArt(scene, 'fx-rays', 0, 0, 1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe9a8);
    this.glow = makeArt(scene, 'fx-glow', 0, 0, 1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0b8);
    this.body = makeArt(scene, 'big-body', 0, 0, 1);
    this.ribbon = makeArt(scene, 'big-ribbon', 0, 0, 1);
    this.opening = makeArt(scene, 'big-open', 0, 0, 1);
    this.lid = makeArt(scene, 'big-lid', 0, 0, 1).setOrigin(0.5, LID_PIVOT_Y / 200);
    this.bow = makeArt(scene, 'big-bow', 0, 0, 1).setOrigin(0.5, BOW_PIVOT_Y / 200);
    this.shine = makeArt(scene, 'big-shine', 0, 0, 1).setBlendMode(Phaser.BlendModes.ADD);
    this.parts = [this.shadow, this.rays, this.glow, this.body, this.opening, this.ribbon, this.lid, this.bow, this.shine];
    this.state = {
      appear: 1,
      shake: 0,
      squash: 0,
      lidY: 0,
      lidRot: 0,
      lidAlpha: 1,
      bowY: 0,
      bowX: 0,
      bowRot: 0,
      bowAlpha: 1,
      ribbonX: 1,
      glow: 0,
      rays: 0,
      shine: 0.6,
    };
    this.setVisible(false);
  }

  setVisible(v) {
    for (const p of this.parts) p.setVisible(v);
  }

  /** Punto (schermo) al centro dell'apertura del pacco, per coriandoli e luci. */
  topAnchor(proj, z) {
    const unit = this.unit(proj, z);
    return { x: proj.x(1, z), y: proj.y(z) - 118 * unit, unit };
  }

  unit(proj, z) {
    return ((proj.layout.laneW * UNITS_PER_LANE) / 200) * proj.scale(z);
  }

  place(proj, z, time, depthBase = 500) {
    const st = this.state;
    const unit = this.unit(proj, z);
    const cx = proj.x(1, z);
    const footY = proj.y(z);
    const m = artMeta('big-body');
    const k = (unit * Math.max(0.001, st.appear)) / m.scale;
    const shakeX = Math.sin(time * 52) * st.shake * 3.2 * unit;
    const shakeRot = Math.sin(time * 41) * st.shake * 0.03;
    const sq = 1 + st.squash * 0.1;
    const ax = cx + shakeX;
    const depth = depthBase - z;

    this.shadow
      .setPosition(cx, footY)
      .setScale((unit * 6.4 * Math.max(0.001, st.appear)) / 128 / artMeta('fx-shadow').scale)
      .setAlpha(0.7)
      .setDepth(depth - 0.4);

    for (const img of [this.body, this.ribbon]) img.setPosition(ax, footY).setScale(k * sq, k / sq).setRotation(shakeRot).setDepth(depth);
    this.ribbon.setScale(k * st.ribbonX * sq, k / sq).setAlpha(st.ribbonX > 0.02 ? 1 : 0).setDepth(depth + 0.01);

    // l'apertura compare quando il coperchio si solleva
    this.opening.setPosition(ax, footY).setScale(k * sq, k / sq).setRotation(shakeRot).setAlpha(Math.min(1, st.lidY / 40)).setDepth(depth + 0.005);
    this.lid
      .setPosition(ax, footY - (FOOT_Y - LID_PIVOT_Y) * unit * st.appear - st.lidY * unit)
      .setScale(k * sq, k / sq)
      .setRotation(shakeRot + st.lidRot)
      .setAlpha(st.lidAlpha)
      .setDepth(depth + 0.02);
    this.bow
      .setPosition(ax + st.bowX * unit, footY - (FOOT_Y - BOW_PIVOT_Y) * unit * st.appear - st.bowY * unit)
      .setScale(k * sq, k / sq)
      .setRotation(shakeRot + st.bowRot)
      .setAlpha(st.bowAlpha)
      .setDepth(depth + 0.03);
    this.shine.setPosition(ax, footY).setScale(k, k).setAlpha(st.shine * (0.6 + 0.4 * Math.sin(time * 4))).setDepth(depth + 0.04);

    const top = footY - 118 * unit;
    const glowSize = (unit * 200 * 2.6) / 256 / artMeta('fx-glow').scale;
    this.glow.setPosition(cx, top).setScale(glowSize * (0.6 + st.glow * 0.7)).setAlpha(st.glow).setDepth(depth - 0.2);
    const raySize = (unit * 200 * 3.4) / 512 / artMeta('fx-rays').scale;
    this.rays.setPosition(cx, top).setScale(raySize).setRotation(time * 0.35).setAlpha(st.rays).setDepth(depth - 0.3);
  }

  destroy() {
    for (const p of this.parts) p.destroy();
  }
}
