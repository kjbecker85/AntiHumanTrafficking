import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Rajdhani } from "next/font/google";
import "./globals.css";
import { AuthGate } from "@/components/AuthGate";
import { TopNav } from "@/components/TopNav";
import { RoleProvider } from "@/components/RoleProvider";
import { Providers } from "@/app/providers";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const hud = Rajdhani({
  subsets: ["latin"],
  variable: "--font-hud",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Human Trafficking Case Support Prototype",
  description: "Frontend-first prototype with link analysis and guided onboarding",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <RoleProvider>
            <div className={`${sans.variable} ${hud.variable} ${mono.variable} min-h-screen`}>
              <TopNav />
              <AuthGate>
                <main className="main-container">{children}</main>
              </AuthGate>
            </div>
          </RoleProvider>
        </Providers>
      </body>
    </html>
  );
}
