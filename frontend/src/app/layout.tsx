import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SesionProvider } from "@/context/SesionContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SGI · Seguridad Andina",
  description: "Sistema de Gestión de Incidencias de Seguridad Andina S.A.C.",
};

export const viewport: Viewport = {
  themeColor: "#1c398e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SesionProvider>{children}</SesionProvider>
      </body>
    </html>
  );
}
