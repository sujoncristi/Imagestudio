
export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

export const applyFilter = async (
  img: HTMLImageElement,
  filterStr: string,
  format: string = 'image/png'
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.filter = filterStr;
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL(format);
};

export const resizeImage = async (
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  format: string = 'image/png'
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL(format);
};

export const addBorder = async (
  img: HTMLImageElement,
  color: string,
  thickness: number, // percentage of smallest dimension
  format: string = 'image/png'
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const pxThickness = (Math.min(img.width, img.height) / 100) * thickness;
  
  ctx.drawImage(img, 0, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = pxThickness * 2; // Stroke is centered, so double it for inner-feeling border
  ctx.strokeRect(0, 0, img.width, img.height);
  
  return canvas.toDataURL(format);
};

export const rotateImage = async (
  img: HTMLImageElement,
  degrees: number,
  format: string = 'image/png'
): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const angleInRad = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(angleInRad));
  const cos = Math.abs(Math.cos(angleInRad));

  canvas.width = img.width * cos + img.height * sin;
  canvas.height = img.width * sin + img.height * cos;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angleInRad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  return canvas.toDataURL(format);
};

export const compressImage = async (
  img: HTMLImageElement,
  quality: number, // 0 to 1
  format: string = 'image/jpeg'
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL(format, quality);
};

export const flipImage = async (
  img: HTMLImageElement,
  direction: 'horizontal' | 'vertical',
  format: string = 'image/png'
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  if (direction === 'horizontal') {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(img, -img.width, 0);
    ctx.restore();
  } else {
    ctx.save();
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, -img.height);
    ctx.restore();
  }

  return canvas.toDataURL(format);
};

export const grayscaleImage = async (
  img: HTMLImageElement,
  format: string = 'image/png'
): Promise<string> => {
  return applyFilter(img, 'grayscale(100%)', format);
};

export const cropImage = async (
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  format: string = 'image/png'
): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
  return canvas.toDataURL(format);
};

export const pixelateImage = async (
  img: HTMLImageElement,
  scale: number,
  format: string = 'image/png'
): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  const w = Math.max(1, img.width * scale);
  const h = Math.max(1, img.height * scale);
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Could not get temp canvas context');

  tempCtx.imageSmoothingEnabled = false;
  tempCtx.drawImage(img, 0, 0, w, h);
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL(format);
};
