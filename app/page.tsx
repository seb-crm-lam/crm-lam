import { redirect } from "next/navigation";


// Données lues à chaque affichage (sinon la page serait figée au moment de la construction).
export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/journee");
}
