"use client";

import type { FC, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type UnlinkProvider = "google" | "apple" | null;

type Props = {
  hasGoogle: boolean;
  unlinkAccountProvider: UnlinkProvider;
  onUnlinkAccount: (provider: "google" | "apple") => Promise<void>;
  onLinkGoogle: () => Promise<void>;
  telegramBlock: ReactNode;
};

/** Блок Google + Telegram на вкладке «Аккаунты» (психолог и клиент). */
export const LinkedAccountsTabContent: FC<Props> = ({
  hasGoogle,
  unlinkAccountProvider,
  onUnlinkAccount,
  onLinkGoogle,
  telegramBlock
}) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Привяжите Google, чтобы входить без пароля и использовать аватар из профиля.
      </p>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {hasGoogle ? (
            <>
              <span className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="20"
                    height="20"
                    className="block"
                  >
                    <path
                      d="M8.00018 3.16667C9.18018 3.16667 10.2368 3.57333 11.0702 4.36667L13.3535 2.08333C11.9668 0.793333 10.1568 0 8.00018 0C4.87352 0 2.17018 1.79333 0.853516 4.40667L3.51352 6.47C4.14352 4.57333 5.91352 3.16667 8.00018 3.16667Z"
                      fill="#EA4335"
                    />
                    <path
                      d="M15.66 8.18335C15.66 7.66002 15.61 7.15335 15.5333 6.66669H8V9.67335H12.3133C12.12 10.66 11.56 11.5 10.72 12.0667L13.2967 14.0667C14.8 12.6734 15.66 10.6134 15.66 8.18335Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M3.51 9.53001C3.35 9.04668 3.25667 8.53334 3.25667 8.00001C3.25667 7.46668 3.34667 6.95334 3.51 6.47001L0.85 4.40668C0.306667 5.48668 0 6.70668 0 8.00001C0 9.29334 0.306667 10.5133 0.853333 11.5933L3.51 9.53001Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M8.0001 16C10.1601 16 11.9768 15.29 13.2968 14.0633L10.7201 12.0633C10.0034 12.5467 9.0801 12.83 8.0001 12.83C5.91343 12.83 4.14343 11.4233 3.5101 9.52667L0.850098 11.59C2.1701 14.2067 4.87343 16 8.0001 16Z"
                      fill="#34A853"
                    />
                  </svg>
                </span>
                Google привязан
                <a
                  href="https://myaccount.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  Перейти в аккаунт
                </a>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={unlinkAccountProvider !== null}
                onClick={() => void onUnlinkAccount("google")}
              >
                {unlinkAccountProvider === "google" ? "Отвязка…" : "Отвязать"}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => void onLinkGoogle()}>
              <span className="flex items-center gap-1">
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    className="block"
                  >
                    <g clipPath="url(#gh_google_clip_settings_btn)">
                      <path
                        d="M8.00018 3.16667C9.18018 3.16667 10.2368 3.57333 11.0702 4.36667L13.3535 2.08333C11.9668 0.793333 10.1568 0 8.00018 0C4.87352 0 2.17018 1.79333 0.853516 4.40667L3.51352 6.47C4.14352 4.57333 5.91352 3.16667 8.00018 3.16667Z"
                        fill="#EA4335"
                      />
                      <path
                        d="M15.66 8.18335C15.66 7.66002 15.61 7.15335 15.5333 6.66669H8V9.67335H12.3133C12.12 10.66 11.56 11.5 10.72 12.0667L13.2967 14.0667C14.8 12.6734 15.66 10.6134 15.66 8.18335Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M3.51 9.53001C3.35 9.04668 3.25667 8.53334 3.25667 8.00001C3.25667 7.46668 3.34667 6.95334 3.51 6.47001L0.85 4.40668C0.306667 5.48668 0 6.70668 0 8.00001C0 9.29334 0.306667 10.5133 0.853333 11.5933L3.51 9.53001Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M8.0001 16C10.1601 16 11.9768 15.29 13.2968 14.0633L10.7201 12.0633C10.0034 12.5467 9.0801 12.83 8.0001 12.83C5.91343 12.83 4.14343 11.4233 3.5101 9.52667L0.850098 11.59C2.1701 14.2067 4.87343 16 8.0001 16Z"
                        fill="#34A853"
                      />
                    </g>
                    <defs>
                      <clipPath id="gh_google_clip_settings_btn">
                        <rect width="16" height="16" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </span>
                <span>Привязать Google</span>
              </span>
            </Button>
          )}
        </div>

        <div className="border-t pt-3">
          <p className="text-sm text-muted-foreground mb-2">Telegram — уведомления и бот</p>
          {telegramBlock}
        </div>
      </div>
    </div>
  );
};

/** @deprecated Используйте LinkedAccountsTabContent; имя сохранено для совместимости импортов. */
export const AccountsTabContent = LinkedAccountsTabContent;
