import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "CRM LAM",
  description: "CRM interne — L'Adresse Marrakchie",
};

// iPhone : la page prend la largeur de l'écran (sinon Safari affiche une
// version d'ordinateur réduite).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="min-h-screen md:flex">
          <Nav />
          {/* Sur iPhone, la navigation est une barre fixe en bas : on réserve sa place. */}
          <main className="flex-1 min-w-0 pb-24 md:pb-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
