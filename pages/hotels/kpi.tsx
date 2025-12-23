import { useEffect } from "react";
import { useRouter } from "next/router";

export default function HotelKpiRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hotels/kpis?tab=charts");
  }, [router]);

  return null;
}
