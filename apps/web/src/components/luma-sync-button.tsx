"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function LumaSyncButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSync = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/sync-luma", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message);
        // Refresh the page data
        router.refresh();
        // Reset to idle after 3 seconds
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        throw new Error(data.error || "Failed to sync contacts");
      }
    } catch (error) {
      console.error("Luma sync error:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Sync failed");
      // Reset to idle after 5 seconds
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant={status === "error" ? "danger" : "outline"}
        size="sm"
        onClick={handleSync}
        disabled={status === "loading"}
        className="min-w-[140px]"
      >
        {status === "loading" ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Syncing...
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            Synced!
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            Retry Sync
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Contacts
          </>
        )}
      </Button>
      {message && (
        <p className={`text-xs font-medium ${status === "success" ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
