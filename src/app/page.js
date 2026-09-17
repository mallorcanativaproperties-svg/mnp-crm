import dynamic from "next/dynamic";

const CRMApp = dynamic(() => import("@/components/CRMApp"), { ssr: false });

export default function Home() {
  return <CRMApp />;
}
