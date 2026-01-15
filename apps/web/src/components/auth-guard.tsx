"use client";

import { useZoPassport } from "zopassport/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Dev bypass - set to true to skip authentication in development
const DEV_BYPASS = false;

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useZoPassport();
  const router = useRouter();

  useEffect(() => {
    if (!DEV_BYPASS && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // In dev mode, skip auth check
  if (DEV_BYPASS) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
