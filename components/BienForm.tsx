import { createBien, updateBien } from "@/lib/actions";
import { listQuartiers, listContacts, listPrestations, getBienPrestations } from "@/lib/repo";
import type { Bien } from "@/lib/types";
import BienFormClient from "./BienFormClient";

// Composant serveur : lit les référentiels (quartiers, contacts,
// prestations) et transmet des props simples (tableaux, primitives) au
// composant client qui gère l'interactivité (affichage conditionnel selon
// le type de bien choisi — voir BienFormClient.tsx).
export default function BienForm({ bien }: { bien?: Bien }) {
  const quartiers = listQuartiers();
  const contacts = listContacts();
  const prestations = listPrestations();
  const prestationsCochees = bien ? getBienPrestations(bien.id).map((p) => p.id) : [];
  const action = bien ? updateBien.bind(null, bien.id) : createBien;

  return (
    <BienFormClient
      bien={bien}
      quartiers={quartiers}
      contacts={contacts}
      prestations={prestations}
      prestationsCochees={prestationsCochees}
      action={action}
    />
  );
}
