import { describe, it, expect } from 'vitest';
import { CollisionSystem } from '../src/game/CollisionSystem.js';

const sys = new CollisionSystem();
const player = (o = {}) => ({ laneX: 1, height: 0, ducking: false, invulnerable: false, ...o });
const gift = (lane, pos, type = 'positive') => ({ kind: 'gift', lane, pos, consumed: false, gift: { id: 'g', type } });
const block = (lane, pos) => ({ kind: 'obstacle', obstacleType: 'block', lane, pos, consumed: false, span: false });
const hurdle = (pos) => ({ kind: 'obstacle', obstacleType: 'hurdle', lane: 1, pos, consumed: false, span: true });
const banner = (pos) => ({ kind: 'obstacle', obstacleType: 'banner', lane: 1, pos, consumed: false, span: true });

// L'oggetto passa da z=+1 a z=-0.5 in un frame
const cross = (entity, p) => sys.check([entity], 0, 1.5, p);

describe('CollisionSystem', () => {
  it('raccoglie un pacco nella corsia della protagonista', () => {
    const e = gift(1, 1);
    const out = cross(e, player());
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('pickup');
    expect(e.consumed).toBe(true);
  });

  it('ignora un pacco in un’altra corsia', () => {
    expect(cross(gift(0, 1), player())).toHaveLength(0);
    expect(cross(gift(2, 1), player({ laneX: 1 }))).toHaveLength(0);
  });

  it('durante un cambio corsia raccoglie nella corsia più vicina entro la tolleranza', () => {
    expect(cross(gift(2, 1), player({ laneX: 1.5 }))).toHaveLength(1);
    expect(cross(gift(1, 1), player({ laneX: 1.5 }))).toHaveLength(1);
  });

  it('un salto alto scavalca i pacchi senza raccoglierli', () => {
    expect(cross(gift(1, 1), player({ height: 1.2 }))).toHaveLength(0);
    expect(cross(gift(1, 1), player({ height: 0.3 }))).toHaveLength(1);
  });

  it('valuta ogni oggetto una sola volta', () => {
    const e = gift(1, 1);
    expect(sys.check([e], 0, 1.5, player())).toHaveLength(1);
    expect(sys.check([e], 1.5, 2, player())).toHaveLength(0);
  });

  it('non valuta oggetti che non hanno ancora raggiunto la protagonista', () => {
    expect(sys.check([gift(1, 10)], 0, 1, player())).toHaveLength(0);
  });

  it('il risultato non dipende dal frame rate (un solo passo grande o tanti piccoli)', () => {
    const big = sys.check([gift(1, 5)], 0, 5.3, player());
    const small = [];
    const e = gift(1, 5);
    for (let d = 0; d < 5.3; d += 0.05) small.push(...sys.check([e], d, d + 0.05, player()));
    expect(big).toHaveLength(1);
    expect(small).toHaveLength(1);
  });

  it('un blocco colpisce solo nella sua corsia', () => {
    expect(cross(block(1, 1), player())).toHaveLength(1);
    expect(cross(block(0, 1), player())).toHaveLength(0);
  });

  it('la barriera di nastri va saltata, non scivolata', () => {
    expect(cross(hurdle(1), player())).toHaveLength(1);
    expect(cross(hurdle(1), player({ height: 1.0 }))).toHaveLength(0);
    expect(cross(hurdle(1), player({ ducking: true }))).toHaveLength(1);
  });

  it('lo striscione va scivolato, non saltato', () => {
    expect(cross(banner(1), player())).toHaveLength(1);
    expect(cross(banner(1), player({ ducking: true }))).toHaveLength(0);
    expect(cross(banner(1), player({ height: 1.2 }))).toHaveLength(1);
  });

  it('durante l’invulnerabilità gli ostacoli non colpiscono', () => {
    expect(cross(block(1, 1), player({ invulnerable: true }))).toHaveLength(0);
  });
});
