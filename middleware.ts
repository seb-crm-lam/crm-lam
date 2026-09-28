import { NextRequest, NextResponse } from "next/server";
import { NOM_COOKIE_SESSION, jetonSessionValide, secretSession } from "@/lib/auth/session";

// Toutes les pages et toutes les routes du CRM exigent une session valide
// (décision de Seb du 28 septembre 2026), sauf les deux pages qui servent à
// l'obtenir. Sans LAM_SESSION_SECRET, le CRM reste fermé (on ne laisse
// jamais passer par défaut).
const CHEMINS_PUBLICS = ["/connexion", "/installation"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (CHEMINS_PUBLICS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const secret = secretSession();
  const jeton = request.cookies.get(NOM_COOKIE_SESSION)?.value;
  if (secret && (await jetonSessionValide(jeton, secret))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erreur: "Connexion requise" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/connexion";
  url.search = `?suite=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Tout, sauf les fichiers techniques de Next.js (scripts, styles, images).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
