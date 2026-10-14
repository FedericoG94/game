import { artMeta, makeArt } from './artBank.js';
import { clamp } from './rng.js';

const HIP_Y = -74;
const SHOULDER_Y = -123;
const HEAD_Y = -186;
const TAU = Math.PI * 2;

const REACTIONS = {
  happy: { dur: 1.05, face: 'c-faceHappy', emote: ['c-emoteHeart', 'c-emoteStar'] },
  shock: { dur: 1.15, face: 'c-faceShock', emote: ['c-emoteShock'] },
  disgust: { dur: 1.25, face: 'c-faceDisgust', emote: ['c-emoteEw'] },
};

const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

/**
 * Mini Carlotta: un piccolo rig 2.5D fatto di parti separate (gambe, braccia, busto, testa,
 * coda di cavallo, cappellino…) animate a ogni frame. Vista da dietro mentre corre; nelle
 * reazioni si gira verso la camera mostrando un volto espressivo.
 *
 * Le coordinate interne sono "unità di disegno": `place()` converte tutto in pixel.
 */
export class Player {
  constructor(scene, { accessory = 'partyHat' } = {}) {
    this.scene = scene;
    this.phase = 0;
    this.time = 0;
    this.view = 'back';
    this.mode = 'run';
    this.reaction = null;
    this.squash = 0;
    this.duck = 0;
    this.turn = 0;
    this.emoteT = 1;
    this.ponytailAngle = 0;
    this.prevAirborne = false;
    this.invulnerable = false;
    this.reducedMotion = false;
    this.scale = 1;

    this.shadow = makeArt(scene, 'fx-shadow', 0, 0, 1);
    this.root = scene.add.container(0, 0);

    const add = (key) => {
      const img = makeArt(scene, key, 0, 0, 1);
      this.root.add(img);
      return img;
    };
    this.hairMass = add('c-hairMass');
    this.ponytailFront = add('c-ponytail');
    this.legL = add('c-legBack');
    this.legR = add('c-legBack');
    this.torso = add('c-torsoBack');
    this.armL = add('c-arm');
    this.armR = add('c-arm');
    this.headBack = add('c-headBack');
    this.headFront = add('c-headFront');
    this.face = add('c-faceNeutral');
    this.hairFront = add('c-hairFront');
    this.ponytailBack = add('c-ponytail');
    this.hat = accessory === 'partyHat' ? add('c-hat') : null;

    this.emote = makeArt(scene, 'c-emoteHeart', 0, 0, 1).setVisible(false);
    this.setView('back');
  }

  set depth(d) {
    this.root.setDepth(d);
    this.shadow.setDepth(d - 0.5);
    this.emote.setDepth(d + 5);
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'idle' || mode === 'cheer') this.setView('front');
    else if (!this.reaction) this.setView('back');
  }

  /** 'back' = di spalle (corsa), 'front' = verso la camera. */
  setView(view) {
    this.view = view;
    const front = view === 'front';
    const retexture = (img, key) => {
      const m = artMeta(key);
      img.setTexture(key).setOrigin(m.origin[0], m.origin[1]);
    };
    retexture(this.legL, front ? 'c-legFront' : 'c-legBack');
    retexture(this.legR, front ? 'c-legFront' : 'c-legBack');
    retexture(this.torso, front ? 'c-torsoFront' : 'c-torsoBack');
    this.hairMass.setVisible(front);
    this.ponytailFront.setVisible(front);
    this.headFront.setVisible(front);
    this.face.setVisible(front);
    this.hairFront.setVisible(front);
    this.headBack.setVisible(!front);
    this.ponytailBack.setVisible(!front);
  }

  setFace(key) {
    if (this.face.texture.key !== key) this.face.setTexture(key);
  }

  /** Avvia una reazione: 'happy' | 'shock' | 'disgust'. */
  react(kind) {
    const r = REACTIONS[kind];
    if (!r) return;
    const wasBack = this.view === 'back';
    this.reaction = { kind, t: 0, dur: r.dur };
    this.setView('front');
    this.setFace(r.face);
    const key = r.emote[Math.floor(Math.random() * r.emote.length)];
    const m = artMeta(key);
    this.emote.setTexture(key).setOrigin(m.origin[0], m.origin[1]).setVisible(true);
    this.emoteKey = key;
    this.emoteT = 0;
    if (wasBack && !this.reducedMotion) this.turn = 1;
  }

  clearReaction() {
    this.reaction = null;
    this.emote.setVisible(false);
    if (this.mode === 'run') this.setView('back');
    this.setFace('c-faceNeutral');
  }

  /** Posiziona i piedi in (x, groundY); `scale` = pixel per unità di disegno. */
  place(x, groundY, scale, lift = 0) {
    this.scale = scale;
    this.root.setPosition(x, groundY - lift);
    this.root.scaleY = scale * (1 - 0.16 * this.squash - 0.38 * this.duck);
    this.root.scaleX = scale * (1 + 0.1 * this.squash + 0.1 * this.duck) * (1 - 0.65 * this.turn);
    const height = clamp(1 - lift / (scale * 300), 0.45, 1);
    const sh = (scale * 1.45 * height) / artMeta('fx-shadow').scale;
    this.shadow.setPosition(x, groundY).setScale(sh, sh).setAlpha(0.55 * height);
    this.emote.setPosition(x + 40 * scale, groundY - lift - 268 * scale);
  }

  /**
   * Anima il rig. In modalità 'run' `motion` (PlayerMotion) guida salto e scivolata.
   * @param {number} dt secondi
   * @param {import('./PlayerMotion.js').PlayerMotion|null} motion
   * @param {number} speed velocità di corsa (m/s)
   */
  update(dt, motion, speed = 10) {
    this.time += dt;
    const reduced = this.reducedMotion;
    let bobY = 0;
    let lean = 0;
    let airborne = false;
    let rising = false;
    let ducking = false;

    if (this.mode === 'run' && motion) {
      airborne = motion.airborne;
      rising = motion.vy > 0;
      ducking = motion.ducking;
      lean = clamp(motion.lateralVelocity * 0.045, -0.3, 0.3);
      this.phase += dt * (airborne ? 2.5 : (1.7 + speed * 0.1) * TAU);
      if (this.prevAirborne && !airborne) this.squash = 1;
      else if (!this.prevAirborne && airborne) this.squash = -0.6;
      this.prevAirborne = airborne;
    } else {
      this.phase += dt * 3.2;
    }
    this.squash += -this.squash * Math.min(1, dt * 14);
    if (Math.abs(this.squash) < 0.01) this.squash = 0;
    this.duck += ((ducking ? 1 : 0) - this.duck) * Math.min(1, dt * 18);
    this.turn = Math.max(0, this.turn - dt * 7);

    const sw = Math.sin(this.phase);
    let legL = 0;
    let legR = 0;
    let armL = 0;
    let armR = 0;
    let torsoRot = 0;
    let headRot = 0;
    let hop = 0;

    if (this.mode === 'run') {
      if (airborne) {
        legL = rising ? 0.6 : 0.35;
        legR = rising ? -0.45 : -0.2;
        armL = rising ? 2.5 : 1.9;
        armR = rising ? -2.5 : -1.9;
        torsoRot = lean;
      } else if (ducking) {
        legL = 0.5 + sw * 0.15;
        legR = -0.5 - sw * 0.15;
        armL = 1.15;
        armR = -1.15;
        torsoRot = 0.3 + lean * 0.3;
        headRot = -0.15;
      } else {
        legL = sw * 0.78;
        legR = -sw * 0.78;
        armL = -sw * 0.85 + 0.18;
        armR = sw * 0.85 - 0.18;
        bobY = -Math.abs(Math.sin(this.phase)) * 6;
        torsoRot = lean + sw * 0.045;
        headRot = lean * 1.1 - sw * 0.03;
      }
    } else if (this.mode === 'stand') {
      // ferma, di spalle: respira e alza leggermente lo sguardo verso il regalo
      bobY = Math.sin(this.time * 2.4) * 1.4;
      armL = 0.12 + Math.sin(this.time * 1.9) * 0.03;
      armR = -0.12 - Math.sin(this.time * 1.9) * 0.03;
      headRot = Math.sin(this.time * 1.4) * 0.03;
    } else if (this.mode === 'idle') {
      const cycle = this.time % 3.4;
      if (cycle > 2.5 && cycle < 3.1 && !reduced) {
        hop = Math.sin(((cycle - 2.5) / 0.6) * Math.PI) * 26;
        armL = 2.5;
        armR = -2.5;
        legL = -0.2;
        legR = 0.2;
        if (!this.reaction) this.setFace('c-faceHappy');
      } else {
        if (!this.reaction) this.setFace('c-faceNeutral');
        armL = 0.14 + Math.sin(this.time * 2) * 0.03;
        armR = -2.3 + (reduced ? 0 : Math.sin(this.time * 8) * 0.38);
        legL = 0.03;
        legR = -0.03;
      }
      bobY = Math.sin(this.time * 3) * 1.6;
      headRot = Math.sin(this.time * 1.7) * 0.05;
      torsoRot = Math.sin(this.time * 1.3) * 0.02;
    } else if (this.mode === 'cheer') {
      const u = (this.time * 1.7) % 1;
      hop = reduced ? 0 : Math.sin(u * Math.PI) * 30;
      armL = 2.6 + Math.sin(this.time * 12) * 0.12;
      armR = -2.6 - Math.sin(this.time * 12) * 0.12;
      legL = hop > 3 ? -0.25 : 0.05;
      legR = hop > 3 ? 0.25 : -0.05;
      headRot = Math.sin(this.time * 5) * 0.06;
      if (!this.reaction) this.setFace('c-faceHappy');
    }

    if (this.reaction) {
      const r = this.reaction;
      r.t += dt;
      const fade = 1 - clamp(r.t / r.dur, 0, 1) ** 2;
      if (r.kind === 'happy') {
        armL = 2.6;
        armR = -2.6;
        hop += reduced ? 0 : Math.abs(Math.sin(r.t * 11)) * 14 * fade;
        headRot += Math.sin(r.t * 9) * 0.07 * fade;
      } else if (r.kind === 'shock') {
        armL = 1.6;
        armR = -1.6;
        torsoRot += reduced ? 0 : Math.sin(r.t * 42) * 0.07 * fade;
        legL = Math.sin(r.t * 24) * 0.7;
        legR = -Math.sin(r.t * 24) * 0.7;
        bobY -= 6 * fade;
      } else if (r.kind === 'disgust') {
        armR = -2.45;
        armL = 0.5;
        torsoRot += -0.14 * fade + (reduced ? 0 : Math.sin(r.t * 30) * 0.03 * fade);
        headRot += (reduced ? 0 : Math.sin(r.t * 18) * 0.1 * fade) + 0.1;
      }
      if (r.t >= r.dur) this.clearReaction();
    }

    const hipY = HIP_Y + bobY * 0.4 - hop;
    this.legL.setPosition(-13, hipY).setRotation(legL);
    this.legR.setPosition(13, hipY).setRotation(legR);
    const upper = bobY - hop;
    this.torso.setPosition(0, -100 + upper).setRotation(torsoRot);
    this.armL.setPosition(-36, SHOULDER_Y + upper).setRotation(armL);
    this.armR.setPosition(36, SHOULDER_Y + upper).setRotation(armR);
    const headX = Math.sin(torsoRot) * -14;
    const headY = HEAD_Y + upper;
    for (const head of [this.headBack, this.headFront, this.face, this.hairFront]) head.setPosition(headX, headY).setRotation(headRot);
    this.hairMass.setPosition(headX, headY - 2).setRotation(headRot);
    if (this.hat) this.hat.setPosition(headX + 8 + Math.sin(headRot) * -30, headY - 40).setRotation(headRot + 0.16);

    // coda di cavallo: segue la testa con un po' di ritardo (molla)
    const target = this.mode === 'run' ? -sw * 0.33 - lean * 1.8 : Math.sin(this.time * 2.2) * 0.12 + headRot * 0.5;
    this.ponytailAngle += (target - this.ponytailAngle) * Math.min(1, dt * 12);
    this.ponytailBack.setPosition(headX, headY + 24).setRotation(headRot + this.ponytailAngle);
    this.ponytailFront.setPosition(headX + 52, headY + 10).setRotation(headRot + 0.62 + this.ponytailAngle * 0.8);

    // invulnerabilità: lieve pulsazione dell'opacità, mai lampeggi bruschi
    this.root.setAlpha(this.invulnerable ? (reduced ? 0.7 : 0.78 + 0.18 * Math.sin(this.time * 14)) : 1);

    // fumetto di reazione: comparsa con rimbalzo, poi piccola pulsazione
    if (this.emote.visible) {
      this.emoteT = Math.min(1, this.emoteT + dt / 0.24);
      const pulse = 1 + Math.sin(this.time * 9) * 0.03;
      const size = (this.scale * 0.95) / artMeta(this.emoteKey).scale;
      this.emote.setScale(size * easeOutBack(this.emoteT) * pulse);
    }
  }

  destroy() {
    this.root.destroy();
    this.shadow.destroy();
    this.emote.destroy();
  }
}
