import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Archivo variable con eje de ancho (wdth) → permite el display "expandido".
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
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
  themeColor: "#0B1220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`dark ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col glow grain court-grid">
        {children}
      </body>
    </html>
  );
}
