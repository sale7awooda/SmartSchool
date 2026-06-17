"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export default function SentryExamplePage() {
  const [clientResult, setClientResult] = useState<string | null>(null);
  const [serverResult, setServerResult] = useState<string | null>(null);

  const triggerClientError = () => {
    Sentry.captureException(new Error("Test client-side error from Sentry example page"));
    setClientResult("Client error captured. Check Sentry dashboard.");
  };

  const triggerServerError = async () => {
    try {
      const res = await fetch("/api/sentry-example");
      const data = await res.json();
      setServerResult(JSON.stringify(data));
    } catch {
      setServerResult("Server error triggered. Check Sentry dashboard.");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>Sentry Verification</h1>
      <p>Use the buttons below to trigger test errors and verify Sentry is capturing them.</p>

      <div style={{ marginTop: 24 }}>
        <button
          onClick={triggerClientError}
          style={{ padding: "12px 24px", background: "#e53e3e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", marginRight: 12 }}
        >
          Trigger Client Error
        </button>
        {clientResult && <p>{clientResult}</p>}
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          onClick={triggerServerError}
          style={{ padding: "12px 24px", background: "#3182ce", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          Trigger Server Error
        </button>
        {serverResult && <p>{serverResult}</p>}
      </div>
    </div>
  );
}
