/// <reference lib="webworker" />
// Computes star directions off the main thread. Messages:
//   { type: 'catalog', stars }            once, rows per STAR_CATALOG_FIELDS
//   { type: 'solve', id, input: SkyInput } any time; replies { id, positions, frame }
import { solveSky, type SkyInput } from './sky';
import { computeStarfield } from './starfield';

let stars: number[][] = [];

self.onmessage = (event: MessageEvent) => {
  const msg = event.data;
  if (msg.type === 'catalog') {
    stars = msg.stars;
    return;
  }
  if (msg.type === 'solve') {
    const input = msg.input as SkyInput;
    const frame = solveSky(input);
    const positions = computeStarfield(stars, frame);
    const { sun, moon, lst, epj } = frame;
    (self as unknown as Worker).postMessage({ id: msg.id, positions, sun, moon, lst, epj }, [
      positions.buffer,
    ]);
  }
};
