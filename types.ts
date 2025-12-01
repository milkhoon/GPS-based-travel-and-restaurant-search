export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  description: string;
  rating?: number;
  address?: string;
  category?: 'restaurant' | 'attraction' | 'cafe';
  tags?: string[];
  imageUrl?: string;
  latitude: number;
  longitude: number;
  photoRef?: string;
}

export interface ReviewSummary {
  summary: string;
  blogLinks: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

export enum AppState {
  IDLE = 'IDLE',
  REQUESTING_LOCATION = 'REQUESTING_LOCATION',
  LOADING_PLACES = 'LOADING_PLACES',
  VIEWING_LIST = 'VIEWING_LIST',
  ERROR = 'ERROR',
}

export enum Tab {
  FOOD = 'food',
  TRAVEL = 'travel',
}