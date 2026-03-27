"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ClientDto } from "@/hooks/use-clients-data";

export function useClientsProfileUrlSync(clients: ClientDto[]) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profileClientOverride, setProfileClientOverride] = useState<ClientDto | null>(null);
  const profileIdFromUrl = searchParams.get("profile");
  const profileClientFromList = useMemo(() => {
    if (!profileIdFromUrl) return null;
    return clients.find(c => c.id === profileIdFromUrl) ?? null;
  }, [clients, profileIdFromUrl]);

  const profileClient = useMemo(() => {
    if (!profileIdFromUrl) return null;
    if (profileClientOverride?.id === profileIdFromUrl) return profileClientOverride;
    return profileClientFromList;
  }, [profileClientFromList, profileClientOverride, profileIdFromUrl]);

  const openProfile = useCallback((client: ClientDto) => {
    setProfileClientOverride(client);
    router.replace(`${pathname}?profile=${client.id}`);
  }, [pathname, router]);

  const closeProfile = useCallback(() => {
    setProfileClientOverride(null);
    router.replace(pathname);
  }, [pathname, router]);

  return {
    profileClient,
    setProfileClient: setProfileClientOverride,
    openProfile,
    closeProfile
  };
}
