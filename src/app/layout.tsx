import type { Metadata } from "next";
import { Noto_Sans_Bengali, Montserrat } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/src/components/layout/ClientLayout";

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  variable: "--font-noto-bengali",
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mobile Hajira",
  description: "Digital Attendance & Institution Management System",
  manifest: "/manifest.json",
  themeColor: "#6f42c1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mobile Hajira",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoBengali.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <body className="font-bengali antialiased" suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
