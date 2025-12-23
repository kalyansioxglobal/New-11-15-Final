import { useEffect } from "react";
import { useRouter } from "next/router";

export default function HotelDisputesRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hotels/issues?tab=disputes");
  }, [router]);

  return null;
}
