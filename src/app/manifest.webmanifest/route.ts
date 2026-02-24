import { NextResponse } from "next/server";

export function GET() {
  const manifest = {
    name: "Manikúra – Rezervace & Galerie",
    short_name: "Manikúra",
    description: "Rezervace termínů manikúry, fotogalerie a inspirace.",
    start_url: "/",
    display: "standalone",
    background_color: "#fef7f8",
    theme_color: "#cb3a5f",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
