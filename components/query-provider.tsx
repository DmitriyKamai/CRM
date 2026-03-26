"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // По умолчанию делаем кэш "длиннее", чтобы не долбить API при навигациях/повторных монтированиях.
            // Для расписания и других "быстрых" доменов staleTime переопределяется в конкретных hooks.
            staleTime: 5 * 60 * 1000,
            gcTime: 15 * 60 * 1000,
            refetchOnWindowFocus: false,
            // На реконнекте глобально не рефетчим автоматически; для расписания — override в hook.
            refetchOnReconnect: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
