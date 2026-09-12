import type { Metadata } from 'next';
import { AI } from './acciones/ai';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mosaico — Asistente Financiero Generativo',
  description: 'Reto Banorte 2026 · Generative UI + MCP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white antialiased">
        <AI>{children}</AI>
      </body>
    </html>
  );
}
