import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Pop Squared",
  description: "Circle population tool with inverse-square mode",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased flex flex-col h-screen">
        <NavBar />
        <div className="flex-1 overflow-hidden">{children}</div>
      </body>
    </html>
  );
}
