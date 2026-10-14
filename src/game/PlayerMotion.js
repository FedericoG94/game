/**
 * Movimento della protagonista: corsia (con interpolazione indipendente dal frame rate),
 * salto e scivolata. Pura logica: nessun rendering.
 */
export class PlayerMotion {
  constructor({ lanes, player }) {
    this.sharpness = lanes.changeSharpness;
    this.cfg = player;
    // Fisica del salto ricavata da altezza e durata: v0 = 4h/T, g = 8h/T²
    this.jumpVelocity = (4 * player.jumpHeight) / player.jumpDurationSec;
    this.gravity = (8 * player.jumpHeight) / player.jumpDurationSec ** 2;
    this.events = [];
    this.reset();
  }

  reset() {
    this.lane = 1;
    this.laneX = 1;
    this.height = 0;
    this.vy = 0;
    this.airborne = false;
    this.slideTime = 0;
    this.jumpBuffer = 0;
    this.slideBuffer = 0;
    this.lateralVelocity = 0;
    this.events.length = 0;
  }

  /** Vero mentre scivola a terra. */
  get ducking() {
    return this.slideTime > 0 && !this.airborne;
  }

  left() {
    this._setLane(this.lane - 1);
  }

  right() {
    this._setLane(this.lane + 1);
  }

  _setLane(next) {
    const clamped = Math.min(2, Math.max(0, next));
    if (clamped === this.lane) return;
    this.lane = clamped;
    this.events.push({ type: 'lane', lane: clamped });
  }

  jump() {
    if (this.airborne) {
      this.jumpBuffer = this.cfg.inputBufferSec;
      return;
    }
    this._startJump();
  }

  slide() {
    if (this.airborne) {
      // Scivolata in aria: caduta rapida e scivolata appena atterra.
      this.vy = Math.min(this.vy, -this.jumpVelocity * 1.4);
      this.slideBuffer = this.cfg.inputBufferSec * 3;
      return;
    }
    this._startSlide();
  }

  _startJump() {
    this.airborne = true;
    this.vy = this.jumpVelocity;
    this.slideTime = 0;
    this.events.push({ type: 'jump' });
  }

  _startSlide() {
    this.slideTime = this.cfg.slideDurationSec;
    this.events.push({ type: 'slide' });
  }

  update(dt) {
    const prevX = this.laneX;
    this.laneX += (this.lane - this.laneX) * (1 - Math.exp(-this.sharpness * dt));
    if (Math.abs(this.lane - this.laneX) < 0.001) this.laneX = this.lane;
    this.lateralVelocity = dt > 0 ? (this.laneX - prevX) / dt : 0;

    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.slideBuffer > 0) this.slideBuffer -= dt;
    if (this.slideTime > 0) this.slideTime = Math.max(0, this.slideTime - dt);

    if (this.airborne) {
      // Cinematica esatta a gravità costante: l'altezza non dipende dal frame rate.
      this.height += this.vy * dt - 0.5 * this.gravity * dt * dt;
      this.vy -= this.gravity * dt;
      if (this.height <= 0) {
        this.height = 0;
        this.vy = 0;
        this.airborne = false;
        this.events.push({ type: 'land' });
        if (this.jumpBuffer > 0) {
          this.jumpBuffer = 0;
          this._startJump();
        } else if (this.slideBuffer > 0) {
          this.slideBuffer = 0;
          this._startSlide();
        }
      }
    }
  }

  drainEvents(into) {
    for (const e of this.events) into.push(e);
    this.events.length = 0;
  }
}
