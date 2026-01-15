"use client";

import { ZoAuth, useZoPassport } from "zopassport/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { isAuthenticated, isLoading, sendOTP, verifyOTP } = useZoPassport();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLoginSuccess = (userId: string, user: unknown) => {
    console.log("Login successful:", userId, user);
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Smart CRM</h1>
          <p className="text-gray-400 mt-2">
            Sign in with your Zo Passport
          </p>
        </div>

        {/* Zo Auth Component */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <ZoAuth
            onSuccess={handleLoginSuccess}
            sendOTP={sendOTP}
            verifyOTP={verifyOTP}
            defaultCountryCode="91"
          />
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Powered by Zo World
        </p>
      </div>
    </div>
  );
}
