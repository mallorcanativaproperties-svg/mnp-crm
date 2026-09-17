import dynamic from "next/dynamic";

export const metadata = {
  title: "Mallorca Nativa Properties",
  description: "Sé el primero en recibir las oportunidades antes de que salgan al mercado.",
  openGraph: {
    title: "Mallorca Nativa Properties",
    description: "Acceso preferente a propiedades en Mallorca antes de que salgan al mercado.",
  },
};

const CualificacionContent = dynamic(
  () => import("./CualificacionContent"),
  { ssr: false }
);

export default function Page() {
  return <CualificacionContent />;
}
