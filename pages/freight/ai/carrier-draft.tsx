import { useEffect } from "react";
import { useRouter } from "next/router";

export default function CarrierDraftRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/freight/ai-tools?tab=carrier-draft");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
