import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SongChord AI",
  description: "Transcribe letra y acordes de tus canciones automáticamente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
