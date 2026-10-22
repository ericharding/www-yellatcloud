import { type RgbaImage } from './rgba_image.ts';

export type Templates = {
  readonly png: RgbaImage;
  readonly gif: Uint8Array;
};

const toRgbaImage = (source: ImageBitmap): RgbaImage => {
  const canvas = new OffscreenCanvas(source.width, source.height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas is not available');
  }
  context.drawImage(source, 0, 0);
  const { width, height, data } = context.getImageData(0, 0, source.width, source.height);
  return { width, height, data };
};

/** Decodes any browser-supported image file into straight RGBA pixels. */
export const decodeImageFile = async (file: Blob): Promise<RgbaImage> => {
  const bitmap = await createImageBitmap(file, {
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
  try {
    return toRgbaImage(bitmap);
  } finally {
    bitmap.close();
  }
};

export const encodePng = async ({ width, height, data }: RgbaImage): Promise<Blob> => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas is not available');
  }
  context.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
};

const fetchBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.blob();
};

export const loadTemplates = async (): Promise<Templates> => {
  const [png, gif] = await Promise.all([
    fetchBlob('/templates/old_man.png'),
    fetchBlob('/templates/old_man_animated.gif'),
  ]);
  return { png: await decodeImageFile(png), gif: new Uint8Array(await gif.arrayBuffer()) };
};
