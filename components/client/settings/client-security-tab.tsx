"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActiveSessionsSection } from "@/components/account/active-sessions-section";
import { SettingsSection } from "./settings-section";
import {
  CLIENT_PASSWORD_REQUIREMENTS,
  evaluatePassword,
  getPasswordError,
  type PasswordChecks
} from "./client-settings-password";

export function ClientSecurityTab({
  changePassword,
  sessionsActive
}: {
  changePassword: UseMutationResult<
    void,
    Error,
    { currentPassword: string; newPassword: string }
  >;
  sessionsActive: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newPasswordChecks, setNewPasswordChecks] = useState<PasswordChecks>(() =>
    evaluatePassword("")
  );
  const [touchedNewPassword, setTouchedNewPassword] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      toast.error("Пароли не совпадают");
      return;
    }
    const checks = evaluatePassword(newPassword);
    const error = getPasswordError(newPassword, checks);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword
      });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch {
      /* toast в useClientSettings */
    }
  }

  const newPasswordError = touchedNewPassword
    ? getPasswordError(newPassword, newPasswordChecks)
    : null;
  const newPasswordValid = !!newPassword && !newPasswordError;

  const passedCount = CLIENT_PASSWORD_REQUIREMENTS.reduce((acc, req) => {
    return acc + (newPasswordChecks[req.key] ? 1 : 0);
  }, 0);

  const progressStage = !newPassword
    ? -1
    : passedCount <= 0
      ? -1
      : passedCount === 1
        ? 0
        : passedCount === 2
          ? 1
          : passedCount === 3
            ? 2
            : 3;

  const progressTrackColor =
    progressStage === -1
      ? "bg-muted/40"
      : progressStage === 0
        ? "bg-destructive/20"
        : progressStage === 1
          ? "bg-amber-500/20"
          : progressStage === 2
            ? "bg-yellow-500/20"
            : "bg-emerald-500/20";

  const progressFillColor =
    progressStage === 0
      ? "bg-destructive/60"
      : progressStage === 1
        ? "bg-amber-500"
        : progressStage === 2
          ? "bg-yellow-500"
          : "bg-emerald-500";

  const progressFillWidthPct = passedCount === 0 ? 0 : (passedCount / 4) * 100;

  return (
    <>
      <SettingsSection title="Смена пароля">
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Текущий пароль</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Новый пароль</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => {
                const value = e.target.value;
                setNewPassword(value);
                setNewPasswordChecks(evaluatePassword(value));
                if (!touchedNewPassword) setTouchedNewPassword(true);
              }}
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
                {CLIENT_PASSWORD_REQUIREMENTS.map((req) => {
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
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Сохранение…" : "Сменить пароль"}
          </Button>
        </form>
      </SettingsSection>
      <SettingsSection title="Активные сессии">
        <ActiveSessionsSection active={sessionsActive} />
      </SettingsSection>
    </>
  );
}
