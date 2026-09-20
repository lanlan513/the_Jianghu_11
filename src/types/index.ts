export interface Sword {
  id: string;
  name: string;
  alias: string;
  dynasty: string;
  owner: string;
  sect: string;
  description: string;
  history: string;
  legend: string;
  imageUrl: string;
  attributes: {
    sharpness: number;
    hardness: number;
    flexibility: number;
    craftsmanship: number;
  };
  popularity: number;
  createdAt: string;
}

export interface Swordsman {
  id: string;
  name: string;
  title: string;
  dynasty: string;
  sect: string;
  biography: string;
  avatarUrl: string;
  swords: string[];
  createdAt: string;
}

export interface Sect {
  id: string;
  name: string;
  location: string;
  foundingDynasty: string;
  description: string;
  emblemUrl: string;
  skills: string[];
  notableSwords: string[];
  popularity: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface SwordListResponse {
  list: Sword[];
  total: number;
  page: number;
  limit: number;
}

export interface SwordFilterParams {
  page?: number;
  limit?: number;
  dynasty?: string;
  sect?: string;
  keyword?: string;
  sortBy?: 'popularity' | 'dynasty' | 'name';
  sortOrder?: 'asc' | 'desc';
}
