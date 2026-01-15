"use client";

import { ZoPassportProvider } from "zopassport/react";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const clientKey = process.env.NEXT_PUBLIC_ZO_CLIENT_KEY || "";

  if (!clientKey) {
    console.warn("Missing NEXT_PUBLIC_ZO_CLIENT_KEY environment variable");
  }

  return (
    <ZoPassportProvider
      clientKey={clientKey}
      baseUrl="https://api.io.zo.xyz"
      autoRefresh={true}
    >
      {children}
    </ZoPassportProvider>
  );
}
