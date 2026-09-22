import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sidro",
  description: "Generator i uvoznik cjenika sa sidrenom cijenom",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ ["--font-atkinson" as string]: "'Atkinson Hyperlegible', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
