import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import TanstackProvider from "@/providers/tanstack-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

export const metadata: Metadata = {
  title: "Pazzell - Watch Ads, Earn Rewards",
  description: "Watch brand video ads, pass a quick quiz, and spin to win cash, discounts, and prizes. Brands run ad campaigns and reach real, engaged viewers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} ${sora.variable} ${inter.className}`}>
      <TanstackProvider>
      <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors/>
        </ThemeProvider>
      </TanstackProvider>
      </body>
    </html>
  );
}
