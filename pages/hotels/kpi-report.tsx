import { useEffect } from "react";
import { useRouter } from "next/router";

export default function HotelKpiReportRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hotels/kpis?tab=yoy-report");
  }, [router]);

  return null;
}
