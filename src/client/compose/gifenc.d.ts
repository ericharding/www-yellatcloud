declare module 'gifenc' {
  export type Palette = readonly (readonly [number, number, number])[];

  export type FrameOptions = {
    palette?: Palette;
    delay?: number;
    dispose?: number;
    first?: boolean;
  };

  export type Encoder = {
    writeFrame(index: Uint8Array, width: number, height: number, options?: FrameOptions): void;
    bytes(): Uint8Array;
  };

  export const GIFEncoder: (options?: { auto?: boolean }) => Encoder;
  export const quantize: (
    rgba: Uint8ClampedArray,
    maxColors: number,
    options?: { format?: 'rgb565' | 'rgb444' | 'rgba4444' },
  ) => Palette;
  export const nearestColorIndex: (
    palette: Palette,
    pixel: readonly [number, number, number],
  ) => number;
}
