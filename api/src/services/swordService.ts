import { swords } from '../data/swords.js';
import type { Sword, SwordFilterParams, SwordListResponse } from '../../../shared/types.js';

export const getSwords = (params: SwordFilterParams): SwordListResponse => {
  const { page = 1, limit = 10, dynasty, sect, keyword, sortBy = 'popularity', sortOrder = 'desc' } = params;
  
  let filteredSwords = [...swords];
  
  if (dynasty) {
    filteredSwords = filteredSwords.filter(s => s.dynasty === dynasty);
  }
  
  if (sect) {
    filteredSwords = filteredSwords.filter(s => s.sect === sect);
  }
  
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    filteredSwords = filteredSwords.filter(s => 
      s.name.toLowerCase().includes(lowerKeyword) ||
      s.alias.toLowerCase().includes(lowerKeyword) ||
      s.owner.toLowerCase().includes(lowerKeyword) ||
      s.description.toLowerCase().includes(lowerKeyword)
    );
  }
  
  if (sortBy) {
    filteredSwords.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'popularity':
          comparison = a.popularity - b.popularity;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN');
          break;
        case 'dynasty':
          comparison = a.dynasty.localeCompare(b.dynasty, 'zh-CN');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
  
  const total = filteredSwords.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const list = filteredSwords.slice(start, end);
  
  return { list, total, page, limit };
};

export const getPopularSwords = (limit: number = 6): Sword[] => {
  return [...swords]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
};

export const getSwordById = (id: string): Sword | undefined => {
  return swords.find(s => s.id === id);
};
