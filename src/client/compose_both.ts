import { composeGif, composePng, decodeImageFile, encodePng, loadTemplates, type RgbaImage } from './compose/index.ts';
import { AppFailure } from './logic/app_error.ts';
import { rasterizeSvg } from './rasterize_svg.ts';

export type Output = { readonly uploadName: string; readonly image: Blob };

export type Rendered = { readonly png: Output; readonly gif: Output };

const decodeLogo = async (file: File): Promise<RgbaImage> => {
  try {
    return await decodeImageFile(file.type === 'image/svg+xml' ? await rasterizeSvg(file) : file);
  } catch {
    throw new AppFailure({ type: 'decode' });
  }
};

const loadTemplatesOrFail = async (): ReturnType<typeof loadTemplates> => {
  try {
    return await loadTemplates();
  } catch {
    throw new AppFailure({ type: 'network' });
  }
};

/** Composes the logo into both templates. */
export const composeBoth = async (file: File): Promise<Rendered> => {
  const [templates, logo] = await Promise.all([loadTemplatesOrFail(), decodeLogo(file)]);
  const png = await encodePng(composePng(logo, templates.png));
  const gif = new Blob([composeGif(logo, templates.gif).slice()], { type: 'image/gif' });
  return { png: { uploadName: file.name, image: png }, gif: { uploadName: file.name, image: gif } };
};
