import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Archivo variable con eje de ancho (wdth) → permite el display "expandido".
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

// JetBrains Mono: cifras tabulares de scoreboard (puntos, games, cupos, horarios).
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Matchpoint — Torneos de pádel",
  description:
    "Gestión y descubrimiento de torneos de pádel para la comunidad: inscribí tu pareja y seguí las zonas.",
  applicationName: "Matchpoint",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Matchpoint",
  },
};

export const viewport: Viewport = {
  themeColor: "#F4F5F8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col glow">
        {children}
      </body>
    </html>
  );
}
