import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Use font-display: swap to prevent blocking
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap', // Use font-display: swap to prevent blocking
});

export const metadata: Metadata = {
  title: "Bmaster",
  description: "AI Assistant Marketplace platform",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Disable aggressive preloading in development to reduce warnings */}
        {process.env.NODE_ENV === 'development' && (
          <meta name="robots" content="noindex,nofollow" />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          {children}
        </AppProviders>
        <Toaster position="top-right"/>
      </body>
    </html>
  );
}
