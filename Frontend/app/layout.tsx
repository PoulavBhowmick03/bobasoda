import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/providers";

const bungee = localFont({
  src: "./fonts/Bungee-Regular.ttf",
  variable: "--font-bungee",
  weight: "400",
});

export const metadata: Metadata = {
  title: "BobaSoda - Crypto Prediction Game",
  description: "Predict crypto prices and win rewards on Base",
  openGraph: {
    title: "BobaSoda - Crypto Prediction Game",
    description: "Predict crypto prices and win rewards on Base",
    images: ["/bobasoda-logo.png"],
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: "https://bobasodamini.vercel.app/bobasoda-logo.png",
      button: {
        title: "Play Now",
        action: {
          type: "launch_miniapp",
          name: "BobaSoda",
          url: "https://bobasodamini.vercel.app",
        },
      },
    }),
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  minimumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={bungee.variable} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
