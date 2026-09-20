import { swordsmen } from '../data/swordsmen.js';
import type { Swordsman } from '../../../shared/types.js';

export const getSwordsmen = (limit?: number): Swordsman[] => {
  let result = [...swordsmen].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  if (limit) {
    result = result.slice(0, limit);
  }
  
  return result;
};

export const getLatestSwordsmen = (limit: number = 4): Swordsman[] => {
  return getSwordsmen(limit);
};

export const getSwordsmanById = (id: string): Swordsman | undefined => {
  return swordsmen.find(s => s.id === id);
};
