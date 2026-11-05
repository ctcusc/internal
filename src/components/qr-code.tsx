"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  buildQr,
  DEFAULT_LOGO_SIZE,
  logoImageBox,
  qrFileName,
  qrToSvg,
  type Qr,
} from "@/lib/qr";

export type QrCodeLogo = {
  /**
   * Same-origin path (e.g. "/qr-logo.svg") or data URL. It is fetched and
   * embedded when someone downloads the code, so it must not be cross-origin.
   */
  src: string;
  /** Logo width as a fraction of the QR symbol. Default 0.22, capped at 0.3. */
  size?: number;
};

export type QrCodeProps = {
  /** The exact short URL shown on the page. This is what a scan opens. */
  value: string;
  /** Centered image. Turns on the highest error correction level automatically. */
  logo?: QrCodeLogo;
  /** Download name without an extension. Defaults to "qr-<short code>". */
  fileName?: string;
  /** Rendered width and height in CSS pixels. Default 224. */
  size?: number;
  className?: string;
};

const PNG_SIZE = 1024;

export function QrCode({
  value,
  logo,
  fileName,
  size = 224,
  className,
}: QrCodeProps) {
  const logoSize = logo ? (logo.size ?? DEFAULT_LOGO_SIZE) : undefined;
  const qr = useMemo(
    () => (value ? buildQr(value, { logoSize }) : null),
    [value, logoSize],
  );
  const [error, setError] = useState<string | null>(null);

  if (!qr) return null;
  const name = fileName ?? qrFileName(value);
  const logoBox = qr.logo ? logoImageBox(qr.logo) : null;

  async function download(format: "png" | "svg") {
    if (!qr) return;
    setError(null);
    try {
      const svg = qrToSvg(qr, {
        logoHref: logo ? await toDataUrl(logo.src) : undefined,
      });
      const blob =
        format === "svg"
          ? new Blob([svg], { type: "image/svg+xml" })
          : // Whole pixels per module keep the edges sharp.
            await svgToPng(svg, qr.size * Math.ceil(PNG_SIZE / qr.size));
      saveBlob(blob, `${name}.${format}`);
    } catch {
      setError("Could not create the download. Try again.");
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <QrSvg qr={qr} size={size} value={value}>
        {logo && logoBox ? (
          <image
            href={logo.src}
            x={logoBox.x}
            y={logoBox.y}
            width={logoBox.size}
            height={logoBox.size}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : null}
      </QrSvg>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => download("png")}>
          <Download aria-hidden="true" />
          PNG
        </Button>
        <Button variant="outline" size="sm" onClick={() => download("svg")}>
          <Download aria-hidden="true" />
          SVG
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function QrSvg({
  qr,
  size,
  value,
  children,
}: {
  qr: Qr;
  size: number;
  value: string;
  children?: React.ReactNode;
}) {
  // Always black on white, including dark mode, so phone cameras can read it.
  return (
    <svg
      role="img"
      aria-label={`QR code for ${value}`}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="rounded-md"
    >
      <rect width={qr.size} height={qr.size} fill="#fff" />
      <path d={qr.path} fill="#000" />
      {children}
    </svg>
  );
}

async function toDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Could not load logo: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read logo."));
    reader.readAsDataURL(blob);
  });
}

async function svgToPng(svg: string, size: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    context.drawImage(image, 0, 0, size, size);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No PNG."))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
