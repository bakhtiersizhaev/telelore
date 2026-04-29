import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://telelore.vercel.app"),
  title: {
    default: "TeleLore - Telegram JSON to NotebookLM Markdown Converter",
    template: "%s | TeleLore",
  },
  description:
    "Free local browser tool that converts Telegram Desktop result.json exports into Markdown chunks for Google NotebookLM.",
  applicationName: "TeleLore",
  keywords: [
    "Telegram export to NotebookLM",
    "Telegram JSON converter",
    "NotebookLM Markdown",
    "Telegram chat to markdown",
    "result.json to md",
    "Telegram history converter",
    "Google NotebookLM sources",
  ],
  authors: [{ name: "TeleLore" }],
  creator: "TeleLore",
  publisher: "TeleLore",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "TeleLore - Telegram JSON to NotebookLM Markdown Converter",
    description:
      "Turn huge Telegram Desktop JSON exports into clean .md chunks for Google NotebookLM. Runs locally in the browser.",
    siteName: "TeleLore",
    images: [
      {
        url: "/og.svg",
        width: 1200,
        height: 630,
        alt: "TeleLore pixel style Telegram to NotebookLM converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TeleLore - Telegram JSON to NotebookLM Markdown Converter",
    description:
      "Free client-side converter for Telegram result.json exports and NotebookLM-ready Markdown chunks.",
    images: ["/og.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
