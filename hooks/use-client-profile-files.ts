"use client";

import { useEffect, useState } from "react";

type ClientFileItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

export function useClientProfileFiles(clientId: string) {
  const [files, setFiles] = useState<ClientFileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setFilesLoading(true);
      setFilesError(null);
    })();
    fetch(`/api/psychologist/clients/${clientId}/files`)
      .then((r) => (r?.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.files)) setFiles(data.files);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setFilesError("Не удалось загрузить файлы клиента");
      })
      .finally(() => {
        if (cancelled) return;
        setFilesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return {
    files,
    setFiles,
    filesLoading,
    setFilesLoading,
    filesError,
    setFilesError
  };
}

