import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/** Piccolo ambiente "browser" finto: basta un EventTarget come window. */
function installFakeBrowser() {
  const win = new EventTarget();
  win.innerWidth = 400;
  win.innerHeight = 800;
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { activeElement: null });
  return win;
}

function key(win, code, props = {}) {
  const ev = new Event('keydown', { cancelable: true });
  Object.assign(ev, { code, ctrlKey: false, metaKey: false, altKey: false, repeat: false, ...props });
  win.dispatchEvent(ev);
  return ev;
}
const keyUp = (win, code) => win.dispatchEvent(Object.assign(new Event('keyup'), { code }));

describe('InputController (tastiera)', () => {
  let win;
  let input;
  let seen;

  beforeEach(async () => {
    win = installFakeBrowser();
    const { InputController } = await import('../src/game/InputController.js');
    input = new InputController();
    seen = [];
    for (const a of ['left', 'right', 'jump', 'slide', 'pause', 'mute']) input.on(a, () => seen.push(a));
  });

  afterEach(() => {
    input.destroy();
    vi.unstubAllGlobals();
  });

  it('mappa frecce, WASD, spazio ed Esc', () => {
    input.setEnabled(true);
    for (const code of ['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'ArrowUp', 'KeyW', 'Space', 'ArrowDown', 'KeyS', 'Escape']) {
      key(win, code);
      keyUp(win, code);
    }
    expect(seen).toEqual(['left', 'left', 'right', 'right', 'jump', 'jump', 'jump', 'slide', 'slide', 'pause']);
  });

  it('un tasto tenuto premuto non genera ripetizioni', () => {
    input.setEnabled(true);
    key(win, 'ArrowLeft');
    key(win, 'ArrowLeft', { repeat: true });
    key(win, 'ArrowLeft', { repeat: true });
    expect(seen).toEqual(['left']);
    keyUp(win, 'ArrowLeft');
    key(win, 'ArrowLeft');
    expect(seen).toEqual(['left', 'left']);
  });

  it('se un rilascio va perso il tasto non resta bloccato', () => {
    input.setEnabled(true);
    key(win, 'Escape');
    key(win, 'Escape'); // nessun keyup in mezzo: deve funzionare lo stesso
    expect(seen).toEqual(['pause', 'pause']);
  });

  it('le azioni di gioco sono ignorate quando il gioco non è attivo, ma pausa e muto restano', () => {
    input.setEnabled(false);
    key(win, 'ArrowLeft');
    key(win, 'Space');
    key(win, 'Escape');
    key(win, 'KeyM');
    expect(seen).toEqual(['pause', 'mute']);
  });

  it('blocca lo scorrimento della pagina solo con le frecce e Spazio durante il gioco', () => {
    input.setEnabled(true);
    expect(key(win, 'ArrowDown').defaultPrevented).toBe(true);
    expect(key(win, 'Space').defaultPrevented).toBe(true);
    expect(key(win, 'KeyA').defaultPrevented).toBe(false);
    input.setEnabled(false);
    expect(key(win, 'Space').defaultPrevented).toBe(false);
  });

  it('ignora le scorciatoie con Ctrl/Alt/Meta', () => {
    input.setEnabled(true);
    key(win, 'KeyA', { ctrlKey: true });
    key(win, 'KeyR', { metaKey: true });
    expect(seen).toEqual([]);
  });

  it('i pulsanti touch usano la stessa via delle azioni', () => {
    input.setEnabled(true);
    input.emit('jump');
    input.emit('slide');
    expect(seen).toEqual(['jump', 'slide']);
  });
});

describe('attachSwipe', () => {
  let el;
  let swipes;
  let controller;

  const ptr = (type, id, x, y, extra = {}) => Object.assign(new Event(type, { cancelable: true }), { pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0, ...extra });

  beforeEach(async () => {
    installFakeBrowser();
    el = new EventTarget();
    el.setPointerCapture = () => {};
    swipes = [];
    const { attachSwipe } = await import('../src/ui/touchControls.js');
    controller = attachSwipe(el, (dir) => swipes.push(dir), { threshold: () => 30 });
  });

  afterEach(() => {
    controller.destroy();
    vi.unstubAllGlobals();
  });

  it('riconosce le quattro direzioni appena si supera la soglia', () => {
    const run = (dx, dy) => {
      el.dispatchEvent(ptr('pointerdown', 1, 200, 400));
      el.dispatchEvent(ptr('pointermove', 1, 200 + dx, 400 + dy));
      el.dispatchEvent(ptr('pointerup', 1, 200 + dx, 400 + dy));
    };
    run(-60, 5);
    run(60, -5);
    run(4, -70);
    run(-3, 70);
    expect(swipes).toEqual(['left', 'right', 'up', 'down']);
  });

  it('un tocco o un movimento piccolo non genera swipe', () => {
    el.dispatchEvent(ptr('pointerdown', 1, 200, 400));
    el.dispatchEvent(ptr('pointermove', 1, 210, 395));
    el.dispatchEvent(ptr('pointerup', 1, 210, 395));
    expect(swipes).toEqual([]);
    expect(controller.justSwiped()).toBe(false);
  });

  it('un gesto lungo nella stessa direzione conta una volta sola', () => {
    el.dispatchEvent(ptr('pointerdown', 1, 200, 400));
    for (let x = 215; x <= 400; x += 15) el.dispatchEvent(ptr('pointermove', 1, x, 400));
    expect(swipes).toEqual(['right']);
  });

  it('cambiando direzione senza alzare il dito si possono dare più comandi', () => {
    el.dispatchEvent(ptr('pointerdown', 1, 200, 400));
    el.dispatchEvent(ptr('pointermove', 1, 240, 400));
    expect(swipes).toEqual(['right']);
    el.dispatchEvent(ptr('pointermove', 1, 240, 340));
    expect(swipes).toEqual(['right', 'up']);
    el.dispatchEvent(ptr('pointermove', 1, 190, 340));
    expect(swipes).toEqual(['right', 'up', 'left']);
  });

  it('si può ripetere lo stesso comando alzando il dito', () => {
    for (let i = 0; i < 2; i++) {
      el.dispatchEvent(ptr('pointerdown', 1, 200, 400));
      el.dispatchEvent(ptr('pointermove', 1, 140, 400));
      el.dispatchEvent(ptr('pointerup', 1, 140, 400));
    }
    expect(swipes).toEqual(['left', 'left']);
  });

  it('segnala di aver appena fatto uno swipe (per ignorare il click successivo sui pulsanti)', () => {
    el.dispatchEvent(ptr('pointerdown', 1, 200, 400));
    el.dispatchEvent(ptr('pointermove', 1, 100, 400));
    expect(controller.justSwiped()).toBe(true);
    expect(controller.justSwiped(0)).toBe(false);
  });

  it('ignora i movimenti di un secondo dito e il tasto destro del mouse', () => {
    el.dispatchEvent(ptr('pointerdown', 1, 200, 400));
    el.dispatchEvent(ptr('pointermove', 2, 50, 400));
    expect(swipes).toEqual([]);
    el.dispatchEvent(ptr('pointerup', 1, 200, 400));
    el.dispatchEvent(ptr('pointerdown', 3, 200, 400, { pointerType: 'mouse', button: 2 }));
    el.dispatchEvent(ptr('pointermove', 3, 100, 400, { pointerType: 'mouse' }));
    expect(swipes).toEqual([]);
  });

  it('dopo destroy non reagisce più', () => {
    controller.destroy();
    el.dispatchEvent(ptr('pointerdown', 1, 200, 400));
    el.dispatchEvent(ptr('pointermove', 1, 100, 400));
    expect(swipes).toEqual([]);
  });
});
