import "@/styles/globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";

const sans = localFont({
  src: [
    {
      path: "../fonts/AlteHaasGroteskRegular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/AlteHaasGroteskBold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ctc-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "CTC Internal", template: "%s · CTC Internal" },
  description: "CTC internal tools.",
  icons: { icon: "/logo.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-svh antialiased">
        <a
          href="#main-content"
          className="bg-primary text-primary-foreground sr-only fixed top-3 left-3 z-50 rounded-md px-4 py-2 focus:not-sr-only"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
