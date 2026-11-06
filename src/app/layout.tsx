import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "GoalPath - High-Performance Goal, Planner & Gratitude Platform",
  description:
    "Production-grade SaaS web platform where high-achievers plan their day, conquer ambitious goals, build consistency, and thank those who helped.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground flex flex-col">
        <AppProvider>
          <Navigation />
          <div className="flex-1 flex flex-col md:pl-64">
            <main className="flex-1 pb-20 md:pb-8 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
