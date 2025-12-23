import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LossNightsRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hotels/issues?tab=loss-nights");
  }, [router]);

  return null;
}
