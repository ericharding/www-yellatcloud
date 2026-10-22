const minSide = 256;
const maxSide = 1024;

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('SVG failed to load'));
    image.src = url;
  });

/** Side length that keeps small icons sharp and caps huge ones. */
export const rasterSide = (naturalLongestSide: number): number =>
  Math.min(maxSide, Math.max(minSide, naturalLongestSide));

/**
 * Chrome's createImageBitmap rejects SVG blobs, so SVGs go through an <img> and a canvas to become a PNG blob.
 * Fails for SVGs without an intrinsic size.
 */
export const rasterizeSvg = async (svg: Blob): Promise<Blob> => {
  const url = URL.createObjectURL(svg);
  try {
    const image = await loadImage(url);
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error('SVG has no intrinsic size');
    }
    const scale = rasterSide(Math.max(image.naturalWidth, image.naturalHeight)) / Math.max(image.naturalWidth, image.naturalHeight);
    const canvas = new OffscreenCanvas(Math.round(image.naturalWidth * scale), Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('2D canvas is not available');
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
};
