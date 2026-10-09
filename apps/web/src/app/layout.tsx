import type { Metadata } from "next";
import Link from "next/link";
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
  title: "왜뜸",
  description: "요즘 이게 왜 유행인지, AI가 대신 알려드려요",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-10 border-b border-coral-100 bg-background/80 backdrop-blur dark:border-stone-800">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-xl">🔥</span>
              <span className="bg-linear-to-r from-coral-500 to-violet-500 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                왜뜸
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-full px-3 py-1.5 text-stone-600 transition-colors hover:bg-coral-50 hover:text-coral-600 dark:text-stone-400 dark:hover:bg-coral-950 dark:hover:text-coral-400"
              >
                랭킹
              </Link>
              <Link
                href="/categories"
                className="rounded-full px-3 py-1.5 text-stone-600 transition-colors hover:bg-coral-50 hover:text-coral-600 dark:text-stone-400 dark:hover:bg-coral-950 dark:hover:text-coral-400"
              >
                카테고리별 유행
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="border-t border-coral-100 py-6 text-center text-xs text-stone-400 dark:border-stone-800">
          유튜브 쇼츠·영상 데이터를 모아 AI가 요약해요 · AI 요약은 사실과 다를 수 있어요
        </footer>
      </body>
    </html>
  );
}
