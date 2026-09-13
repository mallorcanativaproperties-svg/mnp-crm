export const dynamic = "force-dynamic";
import FirmaEncargo from "./FirmaEncargo";

export default function Page({ searchParams }) {
  return <FirmaEncargo token={searchParams.token} />;
}
