import { useEffect } from "react";
import { useRouter } from "next/router";

export default function IncentivesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/incentives?tab=overview");
  }, [router]);

  return (
    <div className="p-6 flex items-center justify-center">
      <p className="text-sm text-gray-500">Redirecting to Incentive Management...</p>
    </div>
  );
}
