import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Gestión Airbnb · Capilla del Monte",
  description: "Plataforma interna de gestión de propiedades",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} antialiased`}>
        <ThemeProvider defaultTheme="dark">
          <ReactQueryProvider>
            {children}
            <Toaster position="top-right" richColors />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
