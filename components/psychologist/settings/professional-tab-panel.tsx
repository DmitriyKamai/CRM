"use client";

import type { Dispatch, FC, SetStateAction } from "react";

import { ProfilePhotoUploadBlock } from "@/components/psychologist/profile-photo-upload-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { psychologistPublicProfilePath } from "@/lib/psychologist-public-profile-path";
import { normalizePublicSlugInput } from "@/lib/settings/public-profile-slug";

export type ProfessionOption = { value: string; label: string };

type Props = {
  /** `PsychologistProfile.id` для превью ссылки без кастомного slug */
  profilePublicId: string;
  profilePhotoUrl: string | null;
  initials: string;
  alt: string;
  onSuccess: () => void;

  profilePagePublished: boolean;
  catalogVisible: boolean;
  visibilitySaving: boolean;
  onProfilePagePublishedChange: (published: boolean) => void;
  onCatalogVisibleChange: (visible: boolean) => void;

  publicSlug: string;
  setPublicSlug: Dispatch<SetStateAction<string>>;

  handleSaveProfessional: (e: React.FormEvent) => Promise<void>;
  savingProfessional: boolean;
  hasProfessionalChanges: boolean;

  bio: string;
  setBio: Dispatch<SetStateAction<string>>;
  BIO_MAX_LENGTH: number;

  specialization: string;
  setSpecialization: Dispatch<SetStateAction<string>>;
  PROFESSION_OPTIONS: ProfessionOption[];

  practiceCountry: string;
  setPracticeCountry: Dispatch<SetStateAction<string>>;
  practiceCity: string;
  setPracticeCity: Dispatch<SetStateAction<string>>;
  worksOnline: boolean;
  setWorksOnline: Dispatch<SetStateAction<boolean>>;

  contactPhone: string;
  setContactPhone: Dispatch<SetStateAction<string>>;
  contactTelegram: string;
  setContactTelegram: Dispatch<SetStateAction<string>>;
  contactViber: string;
  setContactViber: Dispatch<SetStateAction<string>>;
  contactWhatsapp: string;
  setContactWhatsapp: Dispatch<SetStateAction<string>>;
};

export const ProfessionalTabPanel: FC<Props> = ({
  profilePublicId,
  profilePhotoUrl,
  initials,
  alt,
  onSuccess,
  profilePagePublished,
  catalogVisible,
  visibilitySaving,
  onProfilePagePublishedChange,
  onCatalogVisibleChange,
  publicSlug,
  setPublicSlug,
  handleSaveProfessional,
  savingProfessional,
  hasProfessionalChanges,
  bio,
  setBio,
  BIO_MAX_LENGTH,
  specialization,
  setSpecialization,
  PROFESSION_OPTIONS,
  practiceCountry,
  setPracticeCountry,
  practiceCity,
  setPracticeCity,
  worksOnline,
  setWorksOnline,
  contactPhone,
  setContactPhone,
  contactTelegram,
  setContactTelegram,
  contactViber,
  setContactViber,
  contactWhatsapp,
  setContactWhatsapp
}) => {
  const profilePathPreview = psychologistPublicProfilePath({
    id: profilePublicId,
    publicSlug: normalizePublicSlugInput(publicSlug) || null
  });

  return (
    <div className="w-full space-y-8">
      <ProfilePhotoUploadBlock
        profilePhotoUrl={profilePhotoUrl}
        initials={initials}
        alt={alt}
        onSuccess={() => onSuccess()}
      />

      <div className="space-y-4 rounded-lg border border-border/80 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Публичная страница</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Адрес в латинице (3–32 символа: буквы, цифры, дефис). Чтобы включить
            публикацию, укажите уникальный адрес и сохраните форму ниже при
            необходимости, затем включите «Опубликовать страницу».
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="public-slug">Адрес страницы</Label>
          <Input
            id="public-slug"
            value={publicSlug}
            onChange={(e) => setPublicSlug(normalizePublicSlugInput(e.target.value))}
            placeholder="например, ivan-petrov"
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground break-all">
            Ссылка для клиентов:{" "}
            <span className="font-medium text-foreground">{profilePathPreview}</span>
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="space-y-0.5 min-w-0">
            <Label htmlFor="page-published" className="text-base cursor-pointer">
              Опубликовать страницу
            </Label>
            <p className="text-xs text-muted-foreground">
              Страница открывается по короткой ссылке с корня сайта. Если кастомный
              адрес не задан, используется технический id профиля в URL.
            </p>
          </div>
          <Switch
            id="page-published"
            checked={profilePagePublished}
            onCheckedChange={onProfilePagePublishedChange}
            disabled={visibilitySaving}
            className="shrink-0 cursor-pointer disabled:cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="space-y-0.5 min-w-0">
            <Label htmlFor="catalog-visible" className="text-base cursor-pointer">
              Показывать в каталоге
            </Label>
            <p className="text-xs text-muted-foreground">
              Карточка в разделе «Найти психолога». Нужна опубликованная страница.
            </p>
          </div>
          <Switch
            id="catalog-visible"
            checked={catalogVisible}
            onCheckedChange={onCatalogVisibleChange}
            disabled={visibilitySaving || !profilePagePublished}
            className="shrink-0 cursor-pointer disabled:cursor-pointer"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border/80 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Где веду приём</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Эти данные видят клиенты на странице профиля и в каталоге — отдельно от
            личного адреса в анкете.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="practice-country">Страна</Label>
            <Input
              id="practice-country"
              value={practiceCountry}
              onChange={(e) => setPracticeCountry(e.target.value)}
              placeholder="Беларусь"
              maxLength={64}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="practice-city">Город</Label>
            <Input
              id="practice-city"
              value={practiceCity}
              onChange={(e) => setPracticeCity(e.target.value)}
              placeholder="Минск"
              maxLength={64}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="works-online" className="text-base cursor-pointer">
              Работаю онлайн
            </Label>
            <p className="text-xs text-muted-foreground">
              На странице появится отметка «Онлайн».
            </p>
          </div>
          <Switch
            id="works-online"
            checked={worksOnline}
            onCheckedChange={setWorksOnline}
            className="shrink-0 cursor-pointer"
          />
        </div>
      </div>

      <form onSubmit={handleSaveProfessional} className="w-full space-y-5">
        <div className="space-y-2">
          <Label htmlFor="bio">О себе</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Кратко расскажите о себе и подходе к работе"
            className="min-h-[120px] resize-none"
            rows={5}
            maxLength={BIO_MAX_LENGTH}
          />
          <p className="text-xs text-muted-foreground">
            {bio.length} / {BIO_MAX_LENGTH}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Профессия</Label>
          <RadioGroup
            value={specialization}
            onValueChange={setSpecialization}
            className="flex flex-wrap gap-4"
          >
            {PROFESSION_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`prof-${opt.value}`} />
                <Label htmlFor={`prof-${opt.value}`} className="font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Контакты для клиентов</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Будут видны клиентам в вашем профиле
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-phone" className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  className="shrink-0"
                  aria-hidden
                >
                  <path
                    fill="#16a34a"
                    d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.21z"
                  />
                </svg>
                Телефон
              </Label>
              <Input
                id="contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+375 (29) 123-45-67"
                maxLength={32}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-telegram" className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  className="shrink-0"
                  aria-hidden
                >
                  <path
                    fill="#229ED9"
                    d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0z"
                  />
                  <path
                    fill="#FFFFFF"
                    d="M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
                  />
                </svg>
                Telegram
              </Label>
              <Input
                id="contact-telegram"
                value={contactTelegram}
                onChange={(e) => setContactTelegram(e.target.value)}
                placeholder="@username или ссылка"
                maxLength={128}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-viber" className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="15" height="15" className="shrink-0" aria-hidden>
                  <path
                    fill="#7360f2"
                    d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906 2.57-.002.168.13.306.3.31.166.003.305-.13.31-.297.025-1.175-.334-2.193-1.067-2.994-.74-.81-1.777-1.253-3.05-1.346h-.024zm.463 1.63c-.16.002-.29.127-.3.287-.008.167.12.31.288.32.523.028.875.175 1.113.422.24.245.388.62.416 1.164.01.167.15.295.318.287.167-.008.295-.15.287-.317-.03-.644-.215-1.178-.58-1.557-.367-.378-.893-.574-1.52-.607h-.018z"
                  />
                </svg>
                Viber
              </Label>
              <Input
                id="contact-viber"
                value={contactViber}
                onChange={(e) => setContactViber(e.target.value)}
                placeholder="Номер или ссылка"
                maxLength={128}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-whatsapp" className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="15" height="15" className="shrink-0" aria-hidden>
                  <path
                    fill="#25D366"
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.075-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                  />
                </svg>
                WhatsApp
              </Label>
              <Input
                id="contact-whatsapp"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                placeholder="Номер или ссылка"
                maxLength={128}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={savingProfessional || !hasProfessionalChanges}>
          {savingProfessional ? "Сохранение…" : "Сохранить"}
        </Button>
      </form>
    </div>
  );
};
