import Phaser from 'phaser';
import { app } from './app.js';
import { computeLayout, Projection } from './projection.js';
import { Backdrop } from './Backdrop.js';
import { Player } from './Player.js';
import { BigGift } from './BigGift.js';
import { Fx } from './Fx.js';

const PLAZA_RADIUS = 10;

/**
 * Il momento più importante: Carlotta è ferma davanti al grande regalo. Il pacco
 * trema, il fiocco si scioglie, il coperchio salta via in una luce calda, piovono
 * coriandoli e compare il messaggio personale. Da qui si può rigiocare o rivedere le sorprese.
 *
 * La scena riprende esattamente l'ultima inquadratura della corsa (stessi parametri di
 * prospettiva) così il passaggio da una all'altra è invisibile.
 */
export class FinalScene extends Phaser.Scene {
  constructor() {
    super('Final');
  }

  init(data) {
    this.summary = data.summary;
    this.end = data.end;
  }

  create() {
    const { settings } = app;
    const { end } = this;
    this.t = 0;
    this.layout = computeLayout(this.scale.width, this.scale.height, settings.lanes);
    this.proj = new Projection(this.layout);
    this.proj.setCamera(end.laneX);
    this.backdrop = new Backdrop(this, this.proj, { clouds: 5, props: true, quality: app.quality });
    this.player = new Player(this, { accessory: settings.character.accessory });
    this.player.reducedMotion = app.reducedMotion;
    this.player.depth = 500;
    this.player.setMode('stand');
    this.big = new BigGift(this);
    this.big.setVisible(true);
    this.fx = new Fx(this, { quality: app.quality, reducedMotion: app.reducedMotion, particleScale: settings.quality.particles });
    this.flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xfff6d8, 0).setOrigin(0).setDepth(3000);
    this.opened = false;
    this.panel = null;
    this.registryPanel = null;

    app.hud.hide();
    app.setPlaying(false);
    app.ui.setCountdown(null);
    app.ui.setHint(null);
    app.ui.hideCard();
    app.audio.resume();

    const newRecord = app.saveBest(this.summary.score);
    this.best = app.prefs.best;
    this.newRecord = newRecord;

    this.unsubscribe = app.input.on('mute', () => app.setAudio(!app.audio.enabled));
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.runTimeline();
  }

  onResize() {
    this.layout = computeLayout(this.scale.width, this.scale.height, app.settings.lanes);
    this.backdrop.resize(this.layout);
    this.fx.resize();
    this.flash.setSize(this.scale.width, this.scale.height);
  }

  /** Cronologia dell'apertura. I tempi sono in millisecondi dall'inizio della scena. */
  runTimeline() {
    const reduced = app.reducedMotion;
    const st = this.big.state;
    const at = (ms, fn) => this.time.delayedCall(ms, fn);
    const dur = (ms) => (reduced ? Math.min(ms, 350) : ms);

    app.audio.playMusic('final');

    // 1) il pacco si "carica": luce che trapela e leggera scossa
    this.tweens.add({ targets: st, glow: 0.35, rays: 0.12, duration: 1200, ease: 'Sine.Out' });
    at(900, () => {
      app.audio.sfx('giftShake');
      this.tweens.add({ targets: st, shake: reduced ? 0.25 : 1, glow: 0.7, rays: 0.3, duration: dur(1300), ease: 'Sine.In' });
      this.tweens.add({ targets: st, squash: 1, duration: 160, yoyo: true, repeat: reduced ? 2 : 6 });
      this.sparkleTimer = this.time.addEvent({
        delay: 220,
        loop: true,
        callback: () => {
          const a = this.big.topAnchor(this.proj, this.zGift());
          this.fx.sparkles(a.x + (Math.random() - 0.5) * a.unit * 90, a.y + (Math.random() - 0.3) * a.unit * 60, 3);
        },
      });
    });

    // 2) il nastro si scioglie
    at(2300, () => {
      this.tweens.add({ targets: st, ribbonX: 0, duration: 320, ease: 'Cubic.In' });
      this.tweens.add({
        targets: st,
        bowY: 190,
        bowX: reduced ? 0 : 70,
        bowRot: reduced ? 0 : 5,
        bowAlpha: 0,
        duration: dur(900),
        ease: 'Cubic.Out',
      });
    });

    // 3) il coperchio salta via, luce e coriandoli
    at(2800, () => {
      this.opened = true;
      this.sparkleTimer?.remove();
      app.audio.sfx('giftOpen');
      this.tweens.add({ targets: st, shake: 0, duration: 120 });
      this.tweens.add({ targets: st, lidY: 460, lidRot: reduced ? 0 : 2.6, duration: dur(900), ease: 'Cubic.Out' });
      this.tweens.add({ targets: st, lidAlpha: 0, delay: dur(500), duration: 400 });
      this.tweens.add({ targets: st, glow: 1, rays: 0.8, duration: 500, ease: 'Sine.Out' });
      // luce intensa ma non abbagliante: sale in 0.2 s e si spegne dolcemente
      this.tweens.add({ targets: this.flash, alpha: reduced ? 0.18 : 0.5, duration: 200, yoyo: true, hold: 60, ease: 'Sine.Out' });
      this.player.setMode('cheer');
      this.player.react('happy');
      const a = this.big.topAnchor(this.proj, this.zGift());
      this.fx.confettiBurst(a.x, a.y, 70);
      this.fx.sparkles(a.x, a.y, 24);
      at(160, () => this.fx.confettiBurst(a.x - a.unit * 80, a.y + a.unit * 30, 40));
      at(300, () => this.fx.confettiBurst(a.x + a.unit * 80, a.y + a.unit * 30, 40));
      if (!reduced) this.cameras.main.shake(260, 0.006);
      this.fx.rain(true);
    });

    // 4) il messaggio
    at(3500, () => this.showMessage());
  }

  zGift() {
    return this.end.bigGiftPos - this.end.traveled;
  }

  showMessage() {
    this.panel = app.ui.showFinal({
      summary: this.summary,
      best: this.best,
      newRecord: this.newRecord,
      onAgain: () => {
        app.audio.sfx('ui');
        this.scene.start('Runner');
      },
      onReview: () => this.showRegistry(),
      onMenu: () => {
        this.scene.start('Menu');
      },
    });
  }

  showRegistry() {
    this.panel?.setHidden(true);
    this.registryPanel = app.ui.showRegistry({
      registry: this.summary.registry,
      onClose: () => {
        this.registryPanel?.close();
        this.registryPanel = null;
        this.panel?.setHidden(false);
      },
    });
  }

  update(_time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    const { end, proj, layout } = this;
    proj.setCamera(end.laneX);
    this.backdrop.update(dt, {
      traveled: end.traveled,
      scroll: end.scroll,
      progress: 1,
      finishPos: end.gatePos,
      plazaPos: end.bigGiftPos,
      plazaRadius: PLAZA_RADIUS,
      roadEndZ: end.bigGiftPos - end.traveled - PLAZA_RADIUS * 0.78,
    });
    this.big.place(proj, this.zGift(), this.t);
    this.player.update(dt, null, 0);
    this.player.place(proj.x(end.laneX, 0), layout.groundY, layout.heroH / 250, 0);
  }

  cleanup() {
    this.unsubscribe?.();
    this.scale.off('resize', this.onResize, this);
    this.sparkleTimer?.remove();
    this.tweens.killAll();
    this.registryPanel?.close();
    this.panel?.close();
    this.backdrop?.destroy();
    this.player?.destroy();
    this.big?.destroy();
    this.fx?.destroy();
  }
}
