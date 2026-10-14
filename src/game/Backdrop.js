import Phaser from 'phaser';
import { clamp, lerp, smoothstep } from './rng.js';
import { SCENERY_KEYS } from '../art/index.js';
import { artMeta, makeArt, setArt } from './artBank.js';

/** Fasi della giornata lungo la corsa: ogni voce vale a partire da `at` (avanzamento 0..1). */
const THEMES = [
  { at: 0, skyTop: 0x7fd0ff, skyBottom: 0xffe0f0, groundA: 0xbdf2cf, groundB: 0xb0ecc4, roadA: 0x8e7dff, roadB: 0x9d8fff, curbA: 0xff6fa5, curbB: 0xffffff, hillFar: 0xcdb8ff, hillNear: 0xa4e3c4, sun: 0xfff1a8, fog: 0xffe0f0, cloud: 0xffffff, sunY: 0.1, night: 0 },
  { at: 0.28, skyTop: 0x3fbdf0, skyBottom: 0xc9f1ff, groundA: 0xa6efc4, groundB: 0x98e6b8, roadA: 0x8472f5, roadB: 0x9585ff, curbA: 0xff6fa5, curbB: 0xffffff, hillFar: 0xb9c8ff, hillNear: 0x8fdcb4, sun: 0xfff6b8, fog: 0xc9f1ff, cloud: 0xffffff, sunY: 0.14, night: 0 },
  { at: 0.62, skyTop: 0x7b5cff, skyBottom: 0xffb0a0, groundA: 0x8fd9a8, groundB: 0x80cf9c, roadA: 0x7a60e0, roadB: 0x8a70ee, curbA: 0xff8a5c, curbB: 0xffe9c2, hillFar: 0xb08ae0, hillNear: 0x6fbd96, sun: 0xffc27a, fog: 0xffb0a0, cloud: 0xffd2c4, sunY: 0.04, night: 0.1 },
  { at: 0.9, skyTop: 0x1a0f4a, skyBottom: 0x8049c9, groundA: 0x3d2f8f, groundB: 0x35287f, roadA: 0x5646b3, roadB: 0x6455c4, curbA: 0xffc928, curbB: 0xff6fa5, hillFar: 0x4b3094, hillNear: 0x2f2478, sun: 0xfff3c4, fog: 0x8049c9, cloud: 0xb9a4ff, sunY: 0.17, night: 1 },
];

const BAND = 5;
const Z_MAX = 90;
const PROP_SPACING = 7;

function mixInt(a, b, t) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

const hash01 = (a, b = 0) => {
  let h = Math.imul(a + 374761393, 668265263) ^ Math.imul(b + 1274126177, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Heights in metres of the scenery props (their on-screen size follows the perspective). */
const PROP_HEIGHT = { 'sc-balloons': 3.2, 'sc-lollipop-a': 2.8, 'sc-lollipop-b': 2.4, 'sc-candle': 3.6, 'sc-presents': 1.9, 'sc-cupcake': 1.5 };

/**
 * Mondo dietro e attorno ai personaggi: cielo, sole/luna, stelle, nuvole, colline in parallasse,
 * terreno e strada a bande con cordoli e corsie, scenografia di festa e piazza del finale.
 * Tutto condivide la stessa proiezione degli oggetti di gioco.
 */
export class Backdrop {
  constructor(scene, projection, { clouds = 5, props = true, quality = 1 } = {}) {
    this.scene = scene;
    this.proj = projection;
    this.theme = { ...THEMES[0] };
    this.propsEnabled = props;
    this.quality = quality;
    this.time = 0;
    this.roadEndZ = Infinity;

    this.sky = scene.add.graphics().setDepth(-100);
    this.sunGlow = scene.add.image(0, 0, 'fx-glow').setDepth(-99).setBlendMode(Phaser.BlendModes.ADD);
    this.sunCore = scene.add.graphics().setDepth(-98);
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({ img: scene.add.image(0, 0, 'fx-star').setDepth(-97).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD), x: hash01(i, 1), y: hash01(i, 2), s: 0.1 + hash01(i, 3) * 0.22, p: hash01(i, 4) * 6.28 });
    }
    this.clouds = [];
    for (let i = 0; i < clouds; i++) {
      const img = makeArt(scene, 'sc-cloud', 0, 0, 1).setDepth(-96);
      this.clouds.push({ img, x: hash01(i, 11), y: hash01(i, 12), speed: 6 + hash01(i, 13) * 12, size: 0.55 + hash01(i, 14) * 0.7 });
    }
    this.hills = scene.add.graphics().setDepth(-95);
    this.ground = scene.add.graphics().setDepth(-90);
    this.haze = scene.add.graphics().setDepth(-85);
    this.plazaG = scene.add.graphics().setDepth(-80);

    this.props = new Map();
    this.propPool = [];
    this.resize(projection.layout);
  }

  // -------------------------------------------------------------- layout
  resize(layout) {
    this.layout = layout;
    this.proj.setLayout(layout);
    const { w, h } = layout;
    this.sunGlow.setPosition(w * 0.72, layout.horizonY - h * 0.1).setScale((Math.min(w, h) * 1.1) / 256);
    for (const c of this.clouds) {
      const m = artMeta('sc-cloud');
      c.img.setScale((Math.min(w, h) * 0.5 * c.size) / (m.w * m.scale));
    }
  }

  // ---------------------------------------------------------------- tema
  setProgress(progress) {
    let a = THEMES[0];
    let b = THEMES[0];
    for (let i = 0; i < THEMES.length; i++) {
      if (THEMES[i].at <= progress) {
        a = THEMES[i];
        b = THEMES[Math.min(i + 1, THEMES.length - 1)];
      }
    }
    const span = b.at - a.at;
    const t = span > 0 ? smoothstep((progress - a.at) / span) : 0;
    const out = this.theme;
    for (const key of Object.keys(a)) {
      if (key === 'at') continue;
      out[key] = key.startsWith('sunY') || key === 'night' ? lerp(a[key], b[key], t) : mixInt(a[key], b[key], t);
    }
  }

  // --------------------------------------------------------------- update
  /**
   * @param {number} dt secondi
   * @param {{traveled:number, scroll?:number, progress:number, finishPos?:number, plazaPos?:number, plazaRadius?:number, roadEndZ?:number}} s
   *   `traveled` = distanza reale (traguardo e piazza); `scroll` = scorrimento del disegno (bande e scenografia)
   */
  update(dt, s) {
    this.time += dt;
    this.setProgress(s.progress);
    const { layout } = this;
    const { w, horizonY } = layout;

    this.drawSky(w, horizonY);
    this.drawHills(w, horizonY);
    this.drawGround(s);
    this.drawHaze(w, horizonY);
    this.updateClouds(dt, w, horizonY);
    this.updateStars(w, horizonY);
    if (this.propsEnabled) this.updateProps(s);
    this.plazaG.clear();
    if (s.plazaPos !== undefined) this.drawPlaza(s);
  }

  drawSky(w, horizonY) {
    const t = this.theme;
    this.sky.clear();
    this.sky.fillGradientStyle(t.skyTop, t.skyTop, t.skyBottom, t.skyBottom, 1);
    this.sky.fillRect(0, 0, w, horizonY + 3);
    // sole / luna
    const { h } = this.layout;
    const r = Math.min(w, h) * 0.075;
    const cx = w * 0.72;
    const cy = horizonY - h * t.sunY;
    this.sunGlow.setPosition(cx, cy).setTint(t.sun).setAlpha(0.55 + 0.1 * Math.sin(this.time * 0.8));
    this.sunCore.clear();
    this.sunCore.fillStyle(t.sun, 1);
    this.sunCore.fillCircle(cx, cy, r);
    this.sunCore.fillStyle(0xffffff, 0.35);
    this.sunCore.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.45);
  }

  drawHills(w, horizonY) {
    const t = this.theme;
    const { h, laneW } = this.layout;
    const layers = [
      { color: t.hillFar, amp: h * 0.07, base: horizonY - h * 0.004, freq: 2.2, phase: 1.1, par: 0.12 },
      { color: t.hillNear, amp: h * 0.05, base: horizonY + h * 0.002, freq: 3.4, phase: 4.2, par: 0.3 },
    ];
    this.hills.clear();
    const off = this.proj.camLane * laneW;
    for (const l of layers) {
      this.hills.fillStyle(l.color, 1);
      this.hills.beginPath();
      this.hills.moveTo(-10, horizonY + 2);
      const steps = 28;
      for (let i = 0; i <= steps; i++) {
        const x = -10 + ((w + 20) * i) / steps;
        const u = (x - off * l.par) / w;
        const bump = 0.5 + 0.5 * Math.sin(u * Math.PI * l.freq + l.phase) * Math.cos(u * Math.PI * 0.9 + l.phase * 0.5);
        this.hills.lineTo(x, l.base - l.amp * bump);
      }
      this.hills.lineTo(w + 10, horizonY + 2);
      this.hills.closePath();
      this.hills.fillPath();
    }
  }

  updateClouds(dt, w, horizonY) {
    const t = this.theme;
    const { h } = this.layout;
    for (const c of this.clouds) {
      c.x += (c.speed * dt) / w;
      if (c.x > 1.25) c.x = -0.25;
      c.img.setPosition(c.x * w, horizonY * (0.1 + c.y * 0.6) + h * 0.02).setTint(t.cloud).setAlpha(0.88 - t.night * 0.35);
    }
  }

  updateStars(w, horizonY) {
    const t = this.theme;
    const nightAmount = clamp(t.night, 0, 1);
    const pxScale = Math.min(w, this.layout.h) / 700;
    for (const s of this.stars) {
      const tw = 0.6 + 0.4 * Math.sin(this.time * 1.4 + s.p);
      s.img.setPosition(s.x * w, s.y * horizonY * 0.85).setScale(s.s * pxScale).setAlpha(nightAmount * tw);
    }
  }

  // ----------------------------------------------------- terreno e strada
  drawGround(s) {
    const g = this.ground;
    const t = this.theme;
    const { proj } = this;
    const { w, h, horizonY } = this.layout;
    g.clear();
    g.fillStyle(t.groundA, 1);
    g.fillRect(0, horizonY, w, h - horizonY);

    const traveled = s.traveled;
    const scroll = s.scroll ?? traveled;
    const kStart = Math.floor((scroll - 6) / BAND);
    const kEnd = Math.ceil((scroll + Z_MAX) / BAND);
    const roadEnd = s.roadEndZ ?? Infinity;

    for (let k = kEnd; k >= kStart; k--) {
      const zNear = Math.max(-6, k * BAND - scroll);
      const zFar = Math.min(Z_MAX, (k + 1) * BAND - scroll);
      if (zFar <= zNear) continue;
      const yN = proj.y(zNear);
      const yF = proj.y(zFar);
      const odd = k & 1;

      // terreno a bande leggere
      if (odd) {
        g.fillStyle(t.groundB, 1);
        g.fillRect(0, yF, w, yN - yF + 1);
      }

      if (zNear >= roadEnd) continue;
      const zFarRoad = Math.min(zFar, roadEnd);
      const yFR = zFarRoad === zFar ? yF : proj.y(zFarRoad);

      // cordoli
      const cur = odd ? t.curbA : t.curbB;
      g.fillStyle(cur, 1);
      for (const side of [-1, 1]) {
        const inner = side * 1.5;
        const outer = side * 1.82;
        g.beginPath();
        g.moveTo(proj.xOffset(inner, zNear), yN);
        g.lineTo(proj.xOffset(outer, zNear), yN);
        g.lineTo(proj.xOffset(outer, zFarRoad), yFR);
        g.lineTo(proj.xOffset(inner, zFarRoad), yFR);
        g.closePath();
        g.fillPath();
      }

      // asfalto
      g.fillStyle(odd ? t.roadA : t.roadB, 1);
      g.beginPath();
      g.moveTo(proj.xOffset(-1.5, zNear), yN);
      g.lineTo(proj.xOffset(1.5, zNear), yN);
      g.lineTo(proj.xOffset(1.5, zFarRoad), yFR);
      g.lineTo(proj.xOffset(-1.5, zFarRoad), yFR);
      g.closePath();
      g.fillPath();

      // linee di corsia tratteggiate
      if (odd) {
        g.fillStyle(0xffffff, 0.55);
        for (const lx of [-0.5, 0.5]) {
          const hw = 0.035;
          g.beginPath();
          g.moveTo(proj.xOffset(lx - hw, zNear), yN);
          g.lineTo(proj.xOffset(lx + hw, zNear), yN);
          g.lineTo(proj.xOffset(lx + hw, zFarRoad), yFR);
          g.lineTo(proj.xOffset(lx - hw, zFarRoad), yFR);
          g.closePath();
          g.fillPath();
        }
      }
    }

    // linea del traguardo a scacchi
    if (s.finishPos !== undefined) this.drawFinishLine(g, s.finishPos - traveled);
  }

  drawFinishLine(g, zLine) {
    if (zLine < -3 || zLine > Z_MAX) return;
    const { proj } = this;
    const rows = 2;
    const cols = 12;
    const depth = 0.9;
    for (let r = 0; r < rows; r++) {
      const z0 = zLine + r * depth;
      const z1 = z0 + depth;
      const y0 = proj.y(Math.max(z0, -6));
      const y1 = proj.y(z1);
      for (let c = 0; c < cols; c++) {
        const a = -1.5 + (3 * c) / cols;
        const b = -1.5 + (3 * (c + 1)) / cols;
        g.fillStyle((r + c) & 1 ? 0xffffff : 0x2a1245, 1);
        g.beginPath();
        g.moveTo(proj.xOffset(a, Math.max(z0, -6)), y0);
        g.lineTo(proj.xOffset(b, Math.max(z0, -6)), y0);
        g.lineTo(proj.xOffset(b, z1), y1);
        g.lineTo(proj.xOffset(a, z1), y1);
        g.closePath();
        g.fillPath();
      }
    }
  }

  drawHaze(w, horizonY) {
    const { proj } = this;
    const t = this.theme;
    const yEnd = proj.y(46);
    this.haze.clear();
    this.haze.fillGradientStyle(t.fog, t.fog, t.fog, t.fog, 0.95, 0.95, 0, 0);
    this.haze.fillRect(0, horizonY - 1, w, yEnd - horizonY + 1);
  }

  // ------------------------------------------------------------- scenografia
  updateProps(s) {
    const { proj } = this;
    const { landscape, ppm } = this.layout;
    const scroll = s.scroll ?? s.traveled;
    const kMin = Math.ceil((scroll - 5) / PROP_SPACING);
    const kMax = Math.floor((scroll + 66) / PROP_SPACING);
    const keep = new Set();
    const roadEnd = s.roadEndZ ?? Infinity;

    for (let k = kMin; k <= kMax; k++) {
      for (const side of [-1, 1]) {
        const id = `${k}:${side}`;
        keep.add(id);
        const r = hash01(k, side + 3);
        const present = r < (this.quality < 0.7 ? 0.45 : 0.78);
        if (!present) continue;
        const key = SCENERY_KEYS[Math.floor(hash01(k, side + 9) * SCENERY_KEYS.length)];
        const lateral = side * (2.35 + hash01(k, side + 17) * (landscape ? 5.5 : 2.4));
        const pos = k * PROP_SPACING + hash01(k, side + 23) * PROP_SPACING * 0.6;
        const z = pos - scroll;
        if (z > roadEnd + 6) continue;
        let p = this.props.get(id);
        if (!p) {
          p = this.propPool.pop() ?? { img: this.scene.add.image(0, 0, key) };
          setArt(p.img, key, 1);
          p.key = key;
          p.img.setVisible(true);
          this.props.set(id, p);
        }
        const sc = proj.scale(z);
        const px = (PROP_HEIGHT[key] * ppm) / artMeta(key).h;
        p.img.setPosition(proj.xOffset(lateral, z), proj.y(z)).setScale((px * sc) / artMeta(key).scale).setDepth(500 - z);
        p.img.setAlpha(clamp((66 - z) / 18, 0, 1));
        p.img.setFlipX(hash01(k, side + 31) > 0.5);
        if (z < -4) p.img.setVisible(false);
      }
    }
    for (const [id, p] of this.props) {
      if (!keep.has(id)) {
        p.img.setVisible(false);
        this.propPool.push(p);
        this.props.delete(id);
      }
    }
  }

  // ------------------------------------------------------------------- piazza
  /** Piazza del finale: cerchio a terra proiettato in prospettiva con bordo dorato. */
  drawPlaza(s) {
    const g = this.plazaG;
    const { proj } = this;
    const zc = s.plazaPos - s.traveled;
    const R = s.plazaRadius ?? 10;
    const lw = 1.4;
    const ring = (radius, color, alpha) => {
      g.fillStyle(color, alpha);
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const z = zc + Math.sin(a) * radius;
        const lat = (Math.cos(a) * radius) / lw;
        const zz = Math.max(z, -6);
        const x = proj.xOffset(lat, zz);
        const y = proj.y(zz);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.fillPath();
    };
    ring(R, 0xffc928, 1);
    ring(R * 0.94, 0xff9ccd, 1);
    ring(R * 0.7, 0xffb6d9, 1);
    ring(R * 0.42, 0xffd4ea, 1);
    // coriandoli decorativi sul pavimento
    const dots = [0xffc928, 0x28c9d4, 0xa98bff, 0xffffff];
    for (let i = 0; i < 34; i++) {
      const a = hash01(i, 5) * Math.PI * 2;
      const rr = Math.sqrt(hash01(i, 6)) * R * 0.86;
      const z = zc + Math.sin(a) * rr;
      const lat = (Math.cos(a) * rr) / lw;
      if (z < -3) continue;
      const sc = proj.scale(z);
      g.fillStyle(dots[i % 4], 0.85);
      g.fillEllipse(proj.xOffset(lat, z), proj.y(z), this.layout.laneW * 0.16 * sc, this.layout.laneW * 0.07 * sc);
    }
  }

  destroy() {
    for (const p of this.props.values()) p.img.destroy();
    for (const p of this.propPool) p.img.destroy();
    this.props.clear();
    this.propPool.length = 0;
    this.sky.destroy();
    this.sunGlow.destroy();
    this.sunCore.destroy();
    this.hills.destroy();
    this.ground.destroy();
    this.haze.destroy();
    this.plazaG.destroy();
    for (const s of this.stars) s.img.destroy();
    for (const c of this.clouds) c.img.destroy();
  }
}
