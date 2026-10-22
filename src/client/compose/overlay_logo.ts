import { fitImage, type Rect } from './layout.ts';
import { blendOver, resizeArea, type RgbaImage } from './rgba_image.ts';

/** Shrinks `logo` to fit `box` (aspect preserved) and alpha-blends it onto `base`. */
export const overlayLogo = (base: RgbaImage, logo: RgbaImage, box: Rect): RgbaImage => {
  const target = fitImage(logo.width, logo.height, box);
  return blendOver(base, resizeArea(logo, target.width, target.height), target.x, target.y);
};
