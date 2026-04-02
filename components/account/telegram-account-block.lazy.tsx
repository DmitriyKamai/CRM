"use client";

import dynamic from "next/dynamic";

/** Telegram-блок для вкладки «Аккаунты» (единый dynamic import для клиента и психолога). */
export const TelegramAccountBlockLazy = dynamic(
  () => import("./telegram-account-block").then((m) => ({ default: m.TelegramAccountBlock })),
  { ssr: false }
);
