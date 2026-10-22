import { nearestColorIndex, quantize, type Palette } from 'gifenc';
import { encodeAnimation, type IndexedFrame } from './gif_writer.ts';
import { logoBoxes } from './layout.ts';
import { oldManMask } from './old_man_mask.ts';
import { overlayLogo } from './overlay_logo.ts';
import { solidImage, type RgbaImage } from './rgba_image.ts';
import { decodeTemplateFrames, type TemplateFrame } from './template_frames.ts';

type Rgb = readonly [number, number, number];

const WHITE: Rgb = [255, 255, 255];
const PALETTE_SIZE = 256;

const rgbAt = ({ data }: RgbaImage, pixel: number): Rgb => [
  data[pixel * 4] ?? 0,
  data[pixel * 4 + 1] ?? 0,
  data[pixel * 4 + 2] ?? 0,
];

const rgbKey = ([r, g, b]: Rgb): number => (r << 16) | (g << 8) | b;

type MaskedFrame = { readonly frame: TemplateFrame; readonly mask: Uint8Array };

/** The distinct colors of the old man's pixels over all frames, which must survive exactly. */
const oldManColors = (frames: readonly MaskedFrame[]): readonly Rgb[] => {
  const byKey = new Map<number, Rgb>();
  frames.forEach(({ frame, mask }) => {
    mask.forEach((isMan, pixel) => {
      const color = rgbAt(frame.image, pixel);
      if (isMan === 1) {
        byKey.set(rgbKey(color), color);
      }
    });
  });
  return [...byKey.values()];
};

/** Old man colors exactly, then whatever colors the logo layer needs, then an unused transparent entry. */
const buildPalette = (manColors: readonly Rgb[], logoLayer: RgbaImage): Palette => {
  const logoColors = PALETTE_SIZE - manColors.length - 1;
  if (logoColors < 2) {
    throw new Error('Template GIF has too many colors to add a logo');
  }
  return [...manColors, ...quantize(logoLayer.data, logoColors - 1), WHITE, [0, 0, 0]];
};

/** The static logo layer: every pixel mapped to its nearest palette color, with no dithering. */
const logoIndices = (logoLayer: RgbaImage, palette: Palette): Uint8Array =>
  Uint8Array.from({ length: logoLayer.width * logoLayer.height }, (_, pixel) =>
    nearestColorIndex(palette.slice(0, -1), rgbAt(logoLayer, pixel)),
  );

/** One displayed frame: the old man's own pixels over the logo layer. */
const drawFrame = (
  { frame, mask }: MaskedFrame,
  logoLayerIndices: Uint8Array,
  indexByColor: ReadonlyMap<number, number>,
): IndexedFrame => ({
  delayMs: frame.delayMs,
  indices: Uint8Array.from(logoLayerIndices, (logoIndex, pixel) =>
    mask[pixel] === 1 ? (indexByColor.get(rgbKey(rgbAt(frame.image, pixel))) ?? logoIndex) : logoIndex,
  ),
});

/**
 * Draws the logo into the top-left of the animated template with the old man
 * on top of it. Every frame is rebuilt as the logo layer plus the man's exact
 * pixels (found by flood-filling the white background from the border), then
 * stored as the changed rectangle against the previous frame, so the static
 * logo costs nothing after frame 0.
 */
export const composeGif = (logo: RgbaImage, templateGif: Uint8Array): Uint8Array => {
  const decoded = decodeTemplateFrames(templateGif);
  const [first] = decoded;
  if (first === undefined) {
    throw new Error('Template GIF has no frames');
  }
  const { width, height } = first.image;
  const frames = decoded.map((frame) => ({ frame, mask: oldManMask(frame.image) }));
  const logoLayer = overlayLogo(solidImage(width, height, [...WHITE, 255]), logo, logoBoxes.gif);
  const palette = buildPalette(oldManColors(frames), logoLayer);
  const indexByColor = new Map(palette.slice(0, -1).map((color, index) => [rgbKey(color), index] as const));
  const layerIndices = logoIndices(logoLayer, palette);
  return encodeAnimation({
    width,
    height,
    palette,
    transparentIndex: palette.length - 1,
    frames: frames.map((masked) => drawFrame(masked, layerIndices, indexByColor)),
  });
};
