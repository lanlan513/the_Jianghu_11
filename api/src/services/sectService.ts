import { sects } from '../data/sects.js';
import type { Sect } from '../../../shared/types.js';

export const getSects = (limit?: number): Sect[] => {
  let result = [...sects];
  
  if (limit) {
    result = result.slice(0, limit);
  }
  
  return result;
};

export const getPopularSects = (limit: number = 6): Sect[] => {
  return [...sects]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
};

export const getSectById = (id: string): Sect | undefined => {
  return sects.find(s => s.id === id);
};
