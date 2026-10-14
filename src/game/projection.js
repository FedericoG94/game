/**
 * Prospettiva 2.5D: la protagonista sta a z = 0 in basso, gli oggetti arrivano
 * da z > 0 verso un punto di fuga all'orizzonte. Scala = focal / (focal + z).
 */
export const FOCAL = 10;
/** Quanto la camera segue la protagonista lateralmente (0 = fissa, 1 = sempre al centro). */
export const CAMERA_FOLLOW = 0.55;

export function computeLayout(w, h, lanesConfig) {
  const landscape = w > h * 1.05;
  const laneW = Math.max(36, Math.min(w * 0.3, h * 0.19));
  const ppm = laneW / lanesConfig.widthMeters;
  return {
    w,
    h,
    landscape,
    cx: w / 2,
    horizonY: h * (landscape ? 0.34 : 0.35),
    groundY: h * (landscape ? 0.86 : 0.8),
    laneW,
    /** pixel per metro a z = 0 */
    ppm,
    /** altezza visiva della protagonista in pixel (un po' più grande del vero per leggibilità) */
    heroH: ppm * 1.95,
  };
}

export class Projection {
  constructor(layout) {
    this.setLayout(layout);
    this.camLane = 0;
  }

  setLayout(layout) {
    this.layout = layout;
  }

  /** `laneX` è la posizione continua della protagonista (0..2). */
  setCamera(laneX) {
    this.camLane = (laneX - 1) * CAMERA_FOLLOW;
  }

  scale(z) {
    return FOCAL / (FOCAL + Math.max(z, -FOCAL * 0.75));
  }

  y(z) {
    const { horizonY, groundY } = this.layout;
    return horizonY + (groundY - horizonY) * this.scale(z);
  }

  /** x dello schermo del centro della corsia `lane` (può essere frazionaria) alla distanza z. */
  x(lane, z) {
    const { cx, laneW } = this.layout;
    return cx + (lane - 1 - this.camLane) * laneW * this.scale(z);
  }

  /** x per uno scostamento laterale in unità di corsia dal centro del percorso. */
  xOffset(laneOffset, z) {
    const { cx, laneW } = this.layout;
    return cx + (laneOffset - this.camLane) * laneW * this.scale(z);
  }
}
