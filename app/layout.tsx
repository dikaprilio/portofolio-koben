import type { Metadata, Viewport } from "next";
import { Bangers, Comic_Neue, Space_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { PERSON } from "@/lib/content";
import "./globals.css";

const bangers = Bangers({ variable: "--font-bangers", subsets: ["latin"], weight: "400" });
const comic = Comic_Neue({ variable: "--font-comic", subsets: ["latin"], weight: ["400", "700"] });
const spaceMono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: `${PERSON.name} · Portfolio`,
  description: `${PERSON.name}: ${PERSON.role}, ${PERSON.place}.`,
  openGraph: {
    title: `The adventures of ${PERSON.name}`,
    description: `${PERSON.role}, ${PERSON.place}.`,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffd23f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bangers.variable} ${comic.variable} ${spaceMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
