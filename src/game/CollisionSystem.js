/**
 * Collisioni e raccolta. Ogni oggetto viene valutato UNA volta, nel frame in
 * cui attraversa la linea di contatto davanti alla protagonista (z = contatto).
 * Questo rende l'esito indipendente dal frame rate e impossibile da "saltare".
 */
export const COLLISION = {
  giftContactZ: 0.35,
  obstacleContactZ: 0.2,
  giftLaneTolerance: 0.62,
  obstacleLaneTolerance: 0.5,
  /** Oltre questa altezza (m) si scavalca un pacco senza raccoglierlo. */
  giftMaxHeight: 0.9,
  /** Altezza minima per superare una barriera di nastri. */
  hurdleClearance: 0.75,
};

export class CollisionSystem {
  /**
   * @param {Array} entities entità attive (con `pos`, `lane`, `kind`, `consumed`)
   * @param {number} prevDistance distanza al frame precedente
   * @param {number} distance distanza attuale
   * @param {{laneX:number,height:number,ducking:boolean,invulnerable:boolean}} player
   * @returns {Array<{type:'pickup'|'hit', entity:object}>}
   */
  check(entities, prevDistance, distance, player) {
    const events = [];
    for (const e of entities) {
      if (e.consumed) continue;
      const contact = e.kind === 'gift' ? COLLISION.giftContactZ : COLLISION.obstacleContactZ;
      const prevZ = e.pos - prevDistance;
      const z = e.pos - distance;
      if (!(prevZ > contact && z <= contact)) continue;

      if (e.kind === 'gift') {
        const inLane = Math.abs(player.laneX - e.lane) <= COLLISION.giftLaneTolerance;
        if (inLane && player.height <= COLLISION.giftMaxHeight) {
          e.consumed = true;
          events.push({ type: 'pickup', entity: e });
        }
        continue;
      }

      if (player.invulnerable) continue;
      let hit = false;
      if (e.obstacleType === 'block') {
        hit = Math.abs(player.laneX - e.lane) <= COLLISION.obstacleLaneTolerance;
      } else if (e.obstacleType === 'hurdle') {
        hit = player.height < COLLISION.hurdleClearance;
      } else if (e.obstacleType === 'banner') {
        hit = !player.ducking;
      }
      if (hit) {
        e.consumed = true;
        events.push({ type: 'hit', entity: e });
      }
    }
    return events;
  }
}
