import { encode } from "uqr";

/** Largest logo width, as a fraction of the QR symbol, that still scans at error correction H. */
export const MAX_LOGO_SIZE = 0.3;
export const DEFAULT_LOGO_SIZE = 0.22;
/** Quiet zone in modules. The QR spec asks for 4. */
const MARGIN = 4;

export type QrLogoBox = { x: number; y: number; size: number };

export type Qr = {
  /** Width and height in modules, including the quiet zone. */
  size: number;
  /** One SVG path covering every dark module, in module units. */
  path: string;
  /** The cleared square in the middle where a logo goes, in module units. */
  logo: QrLogoBox | null;
};

/**
 * Encodes `value` as a QR code. With `logoSize`, uses the highest error
 * correction level and clears a centered square of modules for an image.
 */
export function buildQr(
  value: string,
  { logoSize }: { logoSize?: number } = {},
): Qr {
  if (!value) throw new Error("QR value is empty.");
  const withLogo = logoSize !== undefined;
  const { data, size: symbol } = encode(value, {
    ecc: withLogo ? "H" : "M",
    border: 0,
  });

  let logo: QrLogoBox | null = null;
  let cleared: (x: number, y: number) => boolean = () => false;
  if (withLogo) {
    const fraction = Math.min(Math.max(logoSize, 0), MAX_LOGO_SIZE);
    // Odd width keeps the square centered on the middle module.
    let width = Math.ceil(symbol * fraction);
    if (width % 2 === 0) width += 1;
    const start = (symbol - width) / 2;
    const end = start + width;
    cleared = (x, y) => x >= start && x < end && y >= start && y < end;
    logo = { x: start + MARGIN, y: start + MARGIN, size: width };
  }

  let path = "";
  data.forEach((row, y) => {
    let x = 0;
    while (x < symbol) {
      if (!row[x] || cleared(x, y)) {
        x += 1;
        continue;
      }
      const runStart = x;
      while (x < symbol && row[x] && !cleared(x, y)) x += 1;
      path += `M${runStart + MARGIN} ${y + MARGIN}h${x - runStart}v1h-${x - runStart}z`;
    }
  });

  return { size: symbol + MARGIN * 2, path, logo };
}

/**
 * Inset between the cleared square and the logo image, in modules, so the
 * image never touches the code.
 */
export const LOGO_PADDING = 0.5;

export function logoImageBox(box: QrLogoBox): QrLogoBox {
  return {
    x: box.x + LOGO_PADDING,
    y: box.y + LOGO_PADDING,
    size: box.size - LOGO_PADDING * 2,
  };
}

/** Standalone SVG document for download. `logoHref` should be a data URL. */
export function qrToSvg(qr: Qr, { logoHref }: { logoHref?: string } = {}) {
  const image =
    qr.logo && logoHref
      ? (() => {
          const box = logoImageBox(qr.logo);
          return `<image href="${escapeAttribute(logoHref)}" x="${box.x}" y="${box.y}" width="${box.size}" height="${box.size}" preserveAspectRatio="xMidYMid meet"/>`;
        })()
      : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size} ${qr.size}" shape-rendering="crispEdges">` +
    `<rect width="${qr.size}" height="${qr.size}" fill="#fff"/>` +
    `<path d="${qr.path}" fill="#000"/>` +
    image +
    `</svg>`
  );
}

/** File name for downloads, based on the short code at the end of the URL. */
export function qrFileName(value: string): string {
  const segment = URL.parse(value)?.pathname.split("/").filter(Boolean).pop();
  const safe = segment?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return safe ? `qr-${safe}` : "qr-code";
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}
