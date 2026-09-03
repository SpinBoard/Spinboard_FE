import type { Metadata } from "next";
import {
  Inter,
  Sora,
  Bricolage_Grotesque,
  Inter_Tight,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import "../styles/tokens.css";
import { ThemeProvider } from "@/providers/theme-provider";
import TanstackProvider from "@/providers/tanstack-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

// Freebiz design-system faces (design/freebiz-brand-kit.html §05) — wired
// straight to the --display/--body/--mono tokens in styles/tokens.css so
// components can just read those variables without knowing which font
// loader produced them. Additive: doesn't replace the Inter/Sora faces
// existing components already use.
const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--display",
});
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--body" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--mono",
});

export const metadata: Metadata = {
  title: "Freebiz - Watch & Promote Ads, Earn Rewards, Find Businesses",
  description:
    "Watch brand video ads on a continuous billboard and catch live freebie codes for real cash. Brands run ad campaigns and reach real, engaged viewers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${sora.variable} ${bricolageGrotesque.variable} ${interTight.variable} ${jetbrainsMono.variable} ${inter.className}`}>
        <TanstackProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange>
            {children}
            <Toaster richColors />
          </ThemeProvider>
        </TanstackProvider>
      </body>
    </html>
  );
}
