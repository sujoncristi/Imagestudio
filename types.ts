
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
  AI_ANALYZE = 'AI_ANALYZE',
  BORDER = 'BORDER',
  ADJUST = 'ADJUST',
  NEURAL_EDIT = 'NEURAL_EDIT',
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
