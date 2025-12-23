import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ITAssetsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/it?tab=assets");
  }, [router]);

  return (
    <div className="p-6 flex items-center justify-center">
      <p className="text-sm text-gray-500">Redirecting to IT Management...</p>
    </div>
  );
}
