import { useEffect } from "react";
import { useRouter } from "next/router";

export default function CoverageWarRoomRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/freight/coverage?tab=war-room");
  }, [router]);

  return (
    <div className="p-6 text-center text-gray-500">
      Redirecting to Coverage...
    </div>
  );
}
