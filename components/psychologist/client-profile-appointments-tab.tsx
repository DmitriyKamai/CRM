"use client";

import { TabsContent } from "@/components/ui/tabs";
import { ClientAppointments } from "@/components/psychologist/client-appointments";

type Props = {
  clientId: string;
};

export function ClientProfileAppointmentsTab({ clientId }: Props) {
  return (
    <TabsContent
      value="appointments"
      className="mt-0 space-y-3 rounded-lg border bg-card p-4"
    >
      <ClientAppointments clientId={clientId} />
    </TabsContent>
  );
}

