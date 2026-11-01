import { RESEAU_ABREGE, RESEAU_LABELS } from "@/lib/format";

// Le nom du réseau est écrit (IG, FB, TT) : la couleur ne porte jamais seule l'information.
const STYLES: Record<string, string> = {
  instagram: "bg-accentbg text-accent",
  facebook: "bg-chip text-text",
  tiktok: "bg-greenbg text-green",
};

export default function PastilleReseau({ reseau }: { reseau: string }) {
  return (
    <span
      title={RESEAU_LABELS[reseau] ?? reseau}
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${STYLES[reseau] ?? "bg-chip text-text"}`}
    >
      {RESEAU_ABREGE[reseau] ?? reseau}
    </span>
  );
}
