import { logoBoxes } from './layout.ts';
import { overlayLogo } from './overlay_logo.ts';
import type { RgbaImage } from './rgba_image.ts';

/** Template with the logo blended into the top-left. Encode with `encodePng`. */
export const composePng = (logo: RgbaImage, template: RgbaImage): RgbaImage =>
  overlayLogo(template, logo, logoBoxes.png);
