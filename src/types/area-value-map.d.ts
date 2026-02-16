import type { GenericMap } from '../models/index.ts';

declare module '../data/maps/area-value-map.json' {
  const value: GenericMap;
  export default value;
}

export {};
