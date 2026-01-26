
export enum ToolType {
  RESIZE = 'RESIZE',
  CROP = 'CROP',
  FILTER = 'FILTER',
  BW = 'BW',
  MIRROR = 'MIRROR',
  ROTATE = 'ROTATE',
  COMPRESS = 'COMPRESS',
  CONVERT = 'CONVERT',
  PIXELATE = 'PIXELATE',
  BORDER = 'BORDER',
  ADJUST = 'ADJUST',
  GRAIN = 'GRAIN'
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  originalSize: number;
  name: string;
}

export interface HistoryItem {
  url: string;
  metadata: ImageMetadata;
  action?: string;
}

export interface ProjectImage {
  id: string;
  url: string;
  history: HistoryItem[];
  historyIndex: number;
  metadata: ImageMetadata;
}

export type ViewType = 'home' | 'editor' | 'enhance' | 'crop' | 'format';
