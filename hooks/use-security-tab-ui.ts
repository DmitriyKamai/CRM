"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { PasswordChecks } from "@/lib/settings/password-rules";
import {
  evaluatePasswordRules,
  getPasswordValidationError,
  SETTINGS_PASSWORD_REQUIREMENTS
} from "@/lib/settings/password-rules";
import type { ChangePasswordBody } from "@/lib/user-settings/post-change-password";

export type SubmitChangePasswordBody = ChangePasswordBody;

type Options = {
  /** Сетевой вызов без toast: при ошибке бросить Error(message). */
  submitChangePassword: (body: SubmitChangePasswordBody) => Promise<void>;
};

export function useSecurityTabUi({ submitChangePassword }: Options) {
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
      await submitChangePassword({ currentPassword, newPassword });
      toast.success("Пароль изменён");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setNewPasswordChecks(evaluatePasswordRules(""));
      setTouchedNewPassword(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось сменить пароль";
      toast.error(message);
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
    return SETTINGS_PASSWORD_REQUIREMENTS.reduce(
      (acc, req) => acc + (newPasswordChecks[req.key] ? 1 : 0),
      0
    );
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
    passwordRequirements: SETTINGS_PASSWORD_REQUIREMENTS,
    progressTrackColor,
    progressFillColor,
    progressFillWidthPct
  };
}

export type SecurityTabUiState = ReturnType<typeof useSecurityTabUi>;
