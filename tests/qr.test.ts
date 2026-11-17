import jsQR from "jsqr";
import { describe, expect, it } from "vitest";

import {
  buildQr,
  logoImageBox,
  MAX_LOGO_SIZE,
  qrFileName,
  qrToSvg,
  type Qr,
  type QrLogoBox,
} from "@/lib/qr";

const SCALE = 8;

/** Rasterizes the SVG path the component and downloads draw, then decodes it. */
function decode(qr: Qr, { darkLogo }: { darkLogo?: QrLogoBox } = {}) {
  const width = qr.size * SCALE;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  const paint = (x: number, y: number, w: number, h: number) => {
    for (let py = y * SCALE; py < (y + h) * SCALE; py++)
      for (let px = x * SCALE; px < (x + w) * SCALE; px++)
        pixels.fill(0, (py * width + px) * 4, (py * width + px) * 4 + 3);
  };
  for (const [, x, y, run] of qr.path.matchAll(/M(\d+) (\d+)h(\d+)/g))
    paint(Number(x), Number(y), Number(run), 1);
  // Worst case for the logo slot: a solid dark square filling the image box.
  if (darkLogo) paint(darkLogo.x, darkLogo.y, darkLogo.size, darkLogo.size);
  return jsQR(pixels, width, width)?.data;
}

const urls = [
  "https://internal.ctcusc.com/go/abc",
  "https://internal.ctcusc.com/go/fall-2026-general-meeting",
  `https://internal.ctcusc.com/go/${"a".repeat(64)}`,
];

describe("buildQr", () => {
  it.each(urls)("encodes %s", (url) => {
    expect(decode(buildQr(url))).toBe(url);
  });

  it.each(urls)("still scans %s with a dark logo in the center", (url) => {
    const qr = buildQr(url, { logoSize: MAX_LOGO_SIZE });
    expect(qr.logo).not.toBeNull();
    expect(decode(qr, { darkLogo: logoImageBox(qr.logo!) })).toBe(url);
  });

  it("centers the logo slot and keeps the quiet zone", () => {
    const qr = buildQr(urls[0]!, { logoSize: 0.22 });
    const logo = qr.logo!;
    expect(logo.x * 2 + logo.size).toBe(qr.size);
    expect(logo.y).toBe(logo.x);
    // The first dark module is the finder's corner, just inside the quiet zone.
    expect(qr.path.startsWith("M4 4h")).toBe(true);
  });

  it("caps oversized logos", () => {
    const qr = buildQr(urls[0]!, { logoSize: 0.9 });
    expect(qr.logo!.size).toBeLessThanOrEqual(
      Math.ceil((qr.size - 8) * MAX_LOGO_SIZE) + 1,
    );
  });

  it("rejects an empty value", () => {
    expect(() => buildQr("")).toThrow();
  });
});

describe("qrToSvg", () => {
  it("writes a standalone SVG with the logo embedded", () => {
    const qr = buildQr(urls[0]!, { logoSize: 0.22 });
    const svg = qrToSvg(qr, { logoHref: 'data:image/svg+xml,"<x>' });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(svg).toContain(`d="${qr.path}"`);
    expect(svg).toContain('href="data:image/svg+xml,&quot;&lt;x>"');
  });

  it("omits the image without a logo", () => {
    expect(qrToSvg(buildQr(urls[0]!))).not.toContain("<image");
  });
});

describe("qrFileName", () => {
  it("uses the short code", () => {
    expect(qrFileName("https://internal.ctcusc.com/go/workshop")).toBe(
      "qr-workshop",
    );
  });

  it("falls back for URLs without a path", () => {
    expect(qrFileName("https://internal.ctcusc.com/")).toBe("qr-code");
    expect(qrFileName("not a url")).toBe("qr-code");
  });
});
