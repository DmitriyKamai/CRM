"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { PasswordChecks } from "@/components/psychologist/settings/security-tab";

type PasswordRequirement = { key: keyof PasswordChecks; text: string };

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: "length", text: "Не менее 8 символов" },
  { key: "letters", text: "Буквы (A–Z, а–я)" },
  { key: "digits", text: "Цифры" },
  { key: "special", text: "Спецсимволы (!, ?, % и т.п.)" }
];

function evaluatePasswordRules(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    letters: /[A-Za-zА-Яа-я]/.test(password),
    digits: /\d/.test(password),
    special: /[^A-Za-zА-Яа-я0-9\s]/.test(password)
  };
}

function getPasswordValidationError(password: string, checks: PasswordChecks): string | null {
  if (password.length === 0) return null;
  if (!checks.length) return "Пароль должен быть не короче 8 символов";
  if (!checks.letters) return "Пароль должен содержать буквы";
  if (!checks.digits) return "Пароль должен содержать цифры";
  if (!checks.special) return "Добавьте специальный символ (например, !, ?, %)";
  return null;
}

export function useSecurityTabUi() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newPasswordChecks, setNewPasswordChecks] = useState<PasswordChecks>(() =>
    evaluatePasswordRules("")
  );
  const [touchedNewPassword, setTouchedNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      toast.error("Пароли не совпадают");
      return;
    }

    const checks = evaluatePasswordRules(newPassword);
    const error = getPasswordValidationError(newPassword, checks);
    if (error) {
      toast.error(error);
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось сменить пароль");
        return;
      }
      toast.success("Пароль изменён");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setNewPasswordChecks(evaluatePasswordRules(""));
      setTouchedNewPassword(false);
    } finally {
      setPasswordSaving(false);
    }
  };

  const onCurrentPasswordChange = (v: string) => setCurrentPassword(v);

  const onNewPasswordChange = (v: string) => {
    setNewPassword(v);
    setNewPasswordChecks(evaluatePasswordRules(v));
    if (!touchedNewPassword) setTouchedNewPassword(true);
  };

  const onNewPasswordConfirmChange = (v: string) => setNewPasswordConfirm(v);

  const newPasswordError = touchedNewPassword
    ? getPasswordValidationError(newPassword, newPasswordChecks)
    : null;

  const newPasswordValid = !!newPassword && !newPasswordError;

  const passedCount = useMemo(() => {
    return PASSWORD_REQUIREMENTS.reduce((acc, req) => acc + (newPasswordChecks[req.key] ? 1 : 0), 0);
  }, [newPasswordChecks]);

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

  return {
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
    passwordRequirements: PASSWORD_REQUIREMENTS,
    progressTrackColor,
    progressFillColor,
    progressFillWidthPct
  };
}

