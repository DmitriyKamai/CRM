"use client";

import { useEffect, useState } from "react";

type DiagnosticItem = {
  id: string;
  testTitle: string;
  createdAt: string;
  interpretation: string | null;
};

export function useClientProfileDiagnostics(opts: {
  clientId: string;
  enabled: boolean;
  active: boolean;
  initial?: DiagnosticItem[];
}) {
  const { clientId, enabled, active, initial } = opts;

  const [diagnosticsList, setDiagnosticsList] = useState<DiagnosticItem[]>(initial ?? []);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !active || !clientId) return;

    let cancelled = false;

    void (async () => {
      setDiagnosticsLoading(true);
    })();

    fetch(`/api/psychologist/clients/${clientId}/diagnostics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { diagnostics?: DiagnosticItem[] } | null) => {
        if (cancelled) return;
        if (Array.isArray(data?.diagnostics)) setDiagnosticsList(data.diagnostics);
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setDiagnosticsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, active, clientId]);

  return { diagnosticsList, setDiagnosticsList, diagnosticsLoading };
}

