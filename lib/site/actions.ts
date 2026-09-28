"use server";

import { revalidatePath } from "next/cache";
import { publierBienSurSite, type ResultatPublication } from "./publication";

export type EtatPublication = ResultatPublication | null;

export async function publierSurSite(bienId: string, _etat: EtatPublication): Promise<EtatPublication> {
  const resultat = await publierBienSurSite(bienId);
  revalidatePath(`/biens/${bienId}`);
  return resultat;
}
