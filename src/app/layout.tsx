import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import ConditionalLayout from "@/components/layout/ConditionalLayout";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
//   display: "swap",
//   fallback: ["system-ui", "arial", "sans-serif"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
//   display: "swap",
//   fallback: ["monospace", "Courier New", "Courier"],
// });

export const metadata: Metadata = {
  title: "University Application Tracker",
  description: "Track your university applications and deadlines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased font-sans`}
        style={{
          fontFamily: " system-ui, arial, sans-serif",
        }}
      >
        <SessionProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
