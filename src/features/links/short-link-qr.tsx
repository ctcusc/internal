"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

import { CtcMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

type ShortLinkQrProps = {
  shortUrl: string;
  /** Embedded so the centered logo also travels with the downloaded SVG. */
  logoDataUrl?: `data:image/${string}`;
};

export function ShortLinkQr({ shortUrl, logoDataUrl }: ShortLinkQrProps) {
  const preview = useRef<SVGSVGElement>(null);

  function downloadSvg() {
    if (!preview.current) return;
    const svg = new XMLSerializer().serializeToString(preview.current);
    const link = document.createElement("a");
    link.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    link.download = "short-link-qr.svg";
    link.click();
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <svg
        ref={preview}
        width={256}
        height={256}
        viewBox="0 0 256 256"
        role="img"
        className="h-auto max-w-full"
      >
        <title>{`QR code for ${shortUrl}`}</title>
        <QRCodeSVG
          aria-hidden="true"
          value={shortUrl}
          size={256}
          marginSize={4}
          level="H"
          imageSettings={
            logoDataUrl
              ? { src: logoDataUrl, width: 40, height: 40, excavate: true }
              : undefined
          }
        />
        {!logoDataUrl && (
          <>
            <rect x="41%" y="43%" width="18%" height="14%" fill="white" />
            <svg x="42%" y="44%" width="16%" height="12%" color="#244225">
              <CtcMark />
            </svg>
          </>
        )}
      </svg>
      <Button type="button" variant="outline" onClick={downloadSvg}>
        Download QR code (SVG)
      </Button>
    </div>
  );
}
