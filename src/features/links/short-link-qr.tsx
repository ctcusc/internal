"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

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
      <QRCodeSVG
        ref={preview}
        value={shortUrl}
        size={256}
        marginSize={4}
        level={logoDataUrl ? "H" : "M"}
        imageSettings={
          logoDataUrl
            ? { src: logoDataUrl, width: 40, height: 40, excavate: true }
            : undefined
        }
        role="img"
        title={`QR code for ${shortUrl}`}
        className="h-auto max-w-full"
      />
      <Button type="button" variant="outline" onClick={downloadSvg}>
        Download QR code (SVG)
      </Button>
    </div>
  );
}
