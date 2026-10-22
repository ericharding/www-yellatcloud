import { logoBoxes } from './layout.ts';
import { overlayLogo } from './overlay_logo.ts';
import { blendOver, solidImage, type RgbaImage } from './rgba_image.ts';

/**
 * The logo in the top-left with the template drawn over it, so the old man
 * hides the logo wherever he overlaps it. Encode with `encodePng`.
 */
export const composePng = (logo: RgbaImage, template: RgbaImage): RgbaImage =>
  blendOver(
    overlayLogo(solidImage(template.width, template.height, [0, 0, 0, 0]), logo, logoBoxes.png),
    template,
    0,
    0,
  );
