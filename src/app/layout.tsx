import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col grain court-grid">
        {children}
      </body>
    </html>
  );
}
