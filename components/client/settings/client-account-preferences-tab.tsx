"use client";

import type { UseMutationResult } from "@tanstack/react-query";

import type { ClientSettingsProfile } from "@/hooks/use-client-settings";
import { useClientAccountPreferencesTabUi } from "@/hooks/use-client-account-preferences-tab-ui";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const LOCALE_SELECT_DEFAULT = "__default__";

export function ClientAccountPreferencesTab({
  profile,
  updateProfile,
  profileSyncVersion
}: {
  profile: ClientSettingsProfile;
  updateProfile: UseMutationResult<unknown, Error, object>;
  profileSyncVersion: number;
}) {
  const tab = useClientAccountPreferencesTabUi({
    profile,
    patchProfile: updateProfile,
    profileSyncVersion
  });

  const localeSelectValue =
    tab.locale === "" || tab.locale == null ? LOCALE_SELECT_DEFAULT : tab.locale;

  return (
    <SettingsSection title="Предпочтения кабинета">
      <p className="text-sm text-muted-foreground">
        Настройки только для вашего аккаунта клиента. Карточки у психологов в CRM не заменяют этот
        блок.
      </p>

      <form onSubmit={tab.handleSavePreferences} className="max-w-xl space-y-5">
        <div className="space-y-2">
          <Label htmlFor="client-pref-name">Как к вам обращаться</Label>
          <Input
            id="client-pref-name"
            value={tab.preferredName}
            onChange={(e) => tab.setPreferredName(e.target.value)}
            placeholder="Например, имя в обращении"
            maxLength={128}
            autoComplete="nickname"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-pref-tz">Часовой пояс (IANA)</Label>
          <Input
            id="client-pref-tz"
            value={tab.timezone}
            onChange={(e) => tab.setTimezone(e.target.value)}
            placeholder="Europe/Moscow"
            maxLength={64}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Для напоминаний и отображения времени записей. Оставьте пустым, если не уверены.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-pref-locale">Язык интерфейса</Label>
          <Select
            value={localeSelectValue}
            onValueChange={(v) => tab.setLocale(v === LOCALE_SELECT_DEFAULT ? "" : v)}
          >
            <SelectTrigger id="client-pref-locale" className="max-w-xs">
              <SelectValue placeholder="По умолчанию" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={LOCALE_SELECT_DEFAULT}>По умолчанию</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
          <div className="space-y-0.5">
            <Label htmlFor="client-pref-reminders" className="cursor-pointer text-sm font-medium">
              Напоминания о сессиях
            </Label>
            <p className="text-xs text-muted-foreground">
              Уведомления о предстоящих приёмах (когда модуль записей включён).
            </p>
          </div>
          <Switch
            id="client-pref-reminders"
            checked={tab.sessionRemindersEnabled}
            onCheckedChange={tab.setSessionRemindersEnabled}
            disabled={tab.saving}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
          <div className="space-y-0.5">
            <Label htmlFor="client-pref-marketing" className="cursor-pointer text-sm font-medium">
              Email-рассылки продукта
            </Label>
            <p className="text-xs text-muted-foreground">
              Новости и полезные материалы на ваш email (отдельно от служебных писем).
            </p>
          </div>
          <Switch
            id="client-pref-marketing"
            checked={tab.marketingEmailsOptIn}
            onCheckedChange={tab.setMarketingEmailsOptIn}
            disabled={tab.saving}
          />
        </div>

        <Button type="submit" disabled={tab.saving || !tab.hasChanges}>
          {tab.saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </form>
    </SettingsSection>
  );
}
