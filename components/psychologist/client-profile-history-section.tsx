"use client";

import { TabsContent } from "@/components/ui/tabs";
import { ClientHistoryPanel } from "@/components/psychologist/client-history-panel";

type Props = {
  clientId: string;
  refreshKey: number;
};

export function ClientProfileHistorySection({ clientId, refreshKey }: Props) {
  return (
    <>
      <TabsContent
        value="history"
        className="mt-0 flex min-h-0 max-h-[min(28rem,52dvh)] flex-col overflow-hidden lg:hidden min-w-0"
      >
        <ClientHistoryPanel
          className="min-h-0 w-full flex-1"
          clientId={clientId}
          refreshKey={refreshKey}
        />
      </TabsContent>

      <div className="hidden min-h-0 shrink-0 self-start overflow-hidden lg:sticky lg:top-4 lg:flex lg:max-h-[min(32rem,52dvh)] lg:w-[30rem] lg:max-w-[min(30rem,42vw)] lg:flex-col min-w-0">
        <ClientHistoryPanel
          className="w-full min-h-0 flex-1"
          clientId={clientId}
          refreshKey={refreshKey}
        />
      </div>
    </>
  );
}

