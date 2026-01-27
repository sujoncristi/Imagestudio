
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

export interface AppLog {
  id: string;
  type: 'visit' | 'click' | 'upload' | 'security';
  timestamp: number;
  details: string;
  location?: string;
  thumbnail?: string;
  browser?: string;
  os?: string;
  screenSize?: string;
  deviceType?: string;
}

export interface SiteSettings {
  title: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroDescription: string;
  programmerName: string;
  programmerRole: string;
  programmerUrl: string;
  programmerImage: string;
  footerCopyright: string;
  accentColor: string;
  passcode: string;
  contactEmail: string;
  showNeuralTools: boolean;
}

export type ViewType = 'home' | 'editor' | 'enhance' | 'crop' | 'format' | 'settings';
