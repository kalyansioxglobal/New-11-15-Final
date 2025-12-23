import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ShipperIcpRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/freight/shipper-health?tab=icp");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-gray-500">Redirecting to Shipper Health...</p>
    </div>
  );
}
