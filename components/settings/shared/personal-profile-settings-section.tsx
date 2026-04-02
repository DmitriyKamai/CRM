"use client";

import type { PersonalProfileFormProps } from "@/components/settings/shared/personal-profile-form";
import { PersonalProfileForm } from "@/components/settings/shared/personal-profile-form";
import { SettingsSection } from "@/components/settings/shared/settings-section";

export type PersonalProfileSettingsSectionProps = Omit<PersonalProfileFormProps, "formClassName"> & {
  title?: string;
  formClassName?: string;
};

/**
 * Единая обёртка: заголовок секции + форма личных данных (согласованные fieldIds задаются снаружи).
 */
export function PersonalProfileSettingsSection({
  title = "Личные данные",
  formClassName,
  ...formProps
}: PersonalProfileSettingsSectionProps) {
  return (
    <SettingsSection title={title}>
      <PersonalProfileForm formClassName={formClassName} {...formProps} />
    </SettingsSection>
  );
}
