import { Color, SRGBColorSpace } from 'three';

/** A content colour, given in sRGB as the finish table gives its colours, as three's working colour. */
export const srgb = ([r, g, b]: readonly [number, number, number]) => new Color().setRGB(r, g, b, SRGBColorSpace);
