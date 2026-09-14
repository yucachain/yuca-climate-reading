import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YucaChain | Cold Chain Climate Monitoring (YucaVault & YucaHub)",
  description:
    "Automated fresh cassava cold chain climate control by YucaChain. Real-time telemetry monitoring for transport YucaVaults and stationary YucaHub storage.",
  icons: {
    icon: "/Logo.png",
    shortcut: "/Logo.png",
    apple: "/Logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased light">
      <body className="min-h-full flex flex-col bg-[#fcfdfd] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
