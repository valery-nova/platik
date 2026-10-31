import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "PLATIK — Tu copiloto financiero con IA",
  description:
    "PLATIK ayuda a emprendedores y pequeños negocios a entender su dinero, controlar ingresos y gastos y ahorrar en dólares digitales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
