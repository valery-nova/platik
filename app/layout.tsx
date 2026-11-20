import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { PreferencesProvider } from "@/lib/preferences";
import "@pollar/react/styles.css";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "PLATIK — Tu copiloto financiero con IA",
  description:
    "PLATIK ayuda a personas y negocios a entender su dinero, controlar ingresos y gastos y ahorrar en dólares digitales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={montserrat.variable}>
      <body className="min-h-screen">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('platik:theme:v1');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}localStorage.getItem('platik:lang:v1')}catch(e){}",
          }}
        />
        <PreferencesProvider>
          <AnalyticsTracker />
          {children}
          <Analytics />
          <SpeedInsights />
        </PreferencesProvider>
      </body>
    </html>
  );
}
