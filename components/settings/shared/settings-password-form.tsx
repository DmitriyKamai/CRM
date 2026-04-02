"use client";

import { Check } from "lucide-react";
import type { FC, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PasswordChecks } from "@/lib/settings/password-rules";

type PasswordRequirement = { key: keyof PasswordChecks; text: string };

type Props = {
  handleChangePassword: (e: FormEvent) => Promise<void>;
  currentPassword: string;
  onCurrentPasswordChange: (v: string) => void;
  newPassword: string;
  onNewPasswordChange: (v: string) => void;
  newPasswordConfirm: string;
  onNewPasswordConfirmChange: (v: string) => void;
  newPasswordChecks: PasswordChecks;
  newPasswordValid: boolean;
  passwordSaving: boolean;
  passwordRequirements: PasswordRequirement[];
  progressTrackColor: string;
  progressFillColor: string;
  progressFillWidthPct: number;
};

/** Форма смены пароля на вкладке «Безопасность» (общая для психолога и клиента). */
export const SecurityTabForm: FC<Props> = ({
  handleChangePassword,
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  newPasswordConfirm,
  onNewPasswordConfirmChange,
  newPasswordChecks,
  newPasswordValid,
  passwordSaving,
  passwordRequirements,
  progressTrackColor,
  progressFillColor,
  progressFillWidthPct
}) => {
  return (
    <form
      onSubmit={handleChangePassword}
      className="mx-auto w-full max-w-sm space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Текущий пароль</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => onCurrentPasswordChange(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Новый пароль</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          className={
            newPasswordValid
              ? "border-emerald-500 focus-visible:ring-emerald-500"
              : undefined
          }
        />

        <div className="space-y-1">
          <div className={`h-1 w-full overflow-hidden rounded-full ${progressTrackColor}`}>
            <div
              className={`h-full rounded-full ${progressFillColor}`}
              style={{ width: `${progressFillWidthPct}%` }}
            />
          </div>
          <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
            {passwordRequirements.map((req) => {
              const passed = newPasswordChecks[req.key];
              return (
                <li key={req.key} className="flex items-center gap-1">
                  <Check
                    className={`h-4 w-4 ${
                      passed ? "text-emerald-500" : "text-muted-foreground/60"
                    }`}
                  />
                  <span className={passed ? "text-foreground" : undefined}>{req.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPasswordConfirm">Повторите новый пароль</Label>
        <Input
          id="newPasswordConfirm"
          type="password"
          value={newPasswordConfirm}
          onChange={(e) => onNewPasswordConfirmChange(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      <Button type="submit" variant="secondary" disabled={passwordSaving}>
        {passwordSaving ? "Сохранение…" : "Сменить пароль"}
      </Button>
    </form>
  );
};
