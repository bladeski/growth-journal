import type { GenericMap } from '../models/index.ts';

declare module '../data/maps/value-challenge-map.json' {
  const value: GenericMap;
  export default value;
}

export {};
