/** Build-time: catalogue entities -> serializable converter zones for the island's props. */
import { getCatalog, nameOf, zoneOf, type Entity } from '../data/catalog';
import { zoneKey } from './time/zone';
import { UTC_ZONE, type ConverterZone } from '../islands/converter/state';

export function toConverterZone(e: Entity): ConverterZone {
  return { key: zoneKey(zoneOf(e)), label: nameOf(e), token: e.slug };
}

/** The "Add city" quick picks: the home-grid cities plus UTC. */
export function quickPicks(): ConverterZone[] {
  return [...getCatalog().homeGrid.map(toConverterZone), UTC_ZONE];
}
