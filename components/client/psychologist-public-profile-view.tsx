import Link from "next/link";
import { CalendarCheck, ChevronLeft, MapPin, Monitor } from "lucide-react";

import {
  ContactBrandPhoneIcon,
  ContactBrandTelegramIcon,
  ContactBrandViberIcon,
  ContactBrandWhatsappIcon
} from "@/components/client/contact-channel-brand-icons";
import { PublicProfileContactPhone } from "@/components/client/public-profile-contact-phone";
import { ClientBooking } from "@/components/schedule/client-booking";
import type { PsychologistPublicProfileDto } from "@/lib/psychologist-public-profile-load";
import { psychologistPublicProfilePath } from "@/lib/psychologist-public-profile-path";
import {
  PSYCHOLOGIST_WORKS_ONLINE_HINT,
  PSYCHOLOGIST_WORKS_ONLINE_LABEL
} from "@/lib/psychologist-works-online-ui";
import {
  formatTelegramForDisplay,
  normalizePhoneForCopy
} from "@/lib/public-contact-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function formatPhoneHref(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("tel:")) return trimmed;
  return `tel:${trimmed.replace(/\s+/g, "")}`;
}

function buildTelegramLink(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const username = v.startsWith("@") ? v.slice(1) : v;
  return `https://t.me/${encodeURIComponent(username)}`;
}

function buildWhatsappLink(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const digits = v.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}`;
}

function buildViberLink(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("viber://") || v.startsWith("http://") || v.startsWith("https://")) {
    return v;
  }
  const digits = v.replace(/[^\d+]/g, "");
  return `viber://chat?number=${encodeURIComponent(digits)}`;
}

type Props = {
  psychologist: PsychologistPublicProfileDto;
  bookingEnabled: boolean;
};

export function PsychologistPublicProfileView({ psychologist, bookingEnabled }: Props) {
  const fullName = `${psychologist.firstName} ${psychologist.lastName}`.trim();
  const practiceLine =
    psychologist.practiceCity || psychologist.practiceCountry
      ? [psychologist.practiceCity, psychologist.practiceCountry].filter(Boolean).join(", ")
      : null;

  const phoneHref = psychologist.contactPhone
    ? formatPhoneHref(psychologist.contactPhone)
    : "";
  const telegramHref = psychologist.contactTelegram
    ? buildTelegramLink(psychologist.contactTelegram)
    : "";
  const whatsappHref = psychologist.contactWhatsapp
    ? buildWhatsappLink(psychologist.contactWhatsapp)
    : "";
  const viberHref = psychologist.contactViber
    ? buildViberLink(psychologist.contactViber)
    : "";

  const hasContacts = !!(phoneHref || telegramHref || whatsappHref || viberHref);

  const specializationLabel =
    psychologist.specialization === "psychotherapist"
      ? "Врач-психотерапевт"
      : psychologist.specialization === "psychiatrist"
        ? "Психиатр"
        : psychologist.specialization
          ? "Психолог"
          : null;

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profilePath = psychologistPublicProfilePath(psychologist);
  const primaryActionHref = bookingEnabled ? "#booking" : hasContacts ? "#contacts" : "/catalog";
  const primaryActionLabel = bookingEnabled
    ? "Записаться на приём"
    : hasContacts
      ? "Связаться"
      : "Вернуться в каталог";

  const hasProfileDetails =
    !!(psychologist.bio ||
      psychologist.therapyApproaches.length > 0 ||
      hasContacts);

  return (
    <div
      className={cn(
        "relative mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 sm:py-8",
        bookingEnabled && "pb-24 sm:pb-8"
      )}
    >
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        К списку психологов
      </Link>

      <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="flex flex-col gap-8 p-5 pt-5 sm:p-6 lg:flex-row lg:items-start lg:gap-10 lg:p-8">
          <div className="mx-auto flex w-full max-w-[280px] shrink-0 flex-col gap-3 lg:mx-0">
            <div
              className={cn(
                "relative aspect-square w-full overflow-hidden rounded-xl bg-muted",
                "shadow-md ring-1 ring-border/40"
              )}
            >
              {psychologist.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={psychologist.profilePhotoUrl}
                  alt={fullName || "Психолог"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="bg-placeholder-surface flex h-full w-full items-center justify-center"
                  aria-hidden
                >
                  <span className="text-3xl font-semibold tracking-tight text-muted-foreground sm:text-4xl">
                    {initials || "—"}
                  </span>
                </div>
              )}
            </div>
            <Button className="w-full shadow-sm" asChild>
              <a href={primaryActionHref}>
                <CalendarCheck className="h-4 w-4" aria-hidden />
                {primaryActionLabel}
              </a>
            </Button>
          </div>

          <div className="min-w-0 flex-1 space-y-4 lg:pt-2">
            <header className="space-y-4 text-center lg:text-left">
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {fullName || "Психолог"}
              </h1>
              {specializationLabel ? (
                <div className="flex justify-center lg:justify-start">
                  <Badge variant="secondary" className="font-semibold">
                    {specializationLabel}
                  </Badge>
                </div>
              ) : null}
              {(psychologist.worksOnline || practiceLine) && (
                <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
                  {psychologist.worksOnline && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-foreground/90"
                      title={PSYCHOLOGIST_WORKS_ONLINE_HINT}
                    >
                      <Monitor className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {PSYCHOLOGIST_WORKS_ONLINE_LABEL}
                    </span>
                  )}
                  {practiceLine && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {practiceLine}
                    </span>
                  )}
                </div>
              )}
            </header>
          </div>
        </div>
      </article>

      {hasProfileDetails ? (
        <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="space-y-6 p-5 sm:p-6 lg:p-8">
            {psychologist.bio && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">О себе</h2>
                <div className="rounded-xl bg-muted/50 px-4 py-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {psychologist.bio}
                </div>
              </section>
            )}

            {psychologist.therapyApproaches.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">Методы работы</h2>
                <TooltipProvider delayDuration={200}>
                  <div className="flex flex-wrap gap-2">
                    {psychologist.therapyApproaches.map((a) =>
                      a.description ? (
                        <Tooltip key={a.slug}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="secondary"
                              className="cursor-help font-medium"
                              tabIndex={0}
                            >
                              {a.nameRu}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs leading-relaxed">
                            {a.description}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge key={a.slug} variant="secondary" className="font-medium">
                          {a.nameRu}
                        </Badge>
                      )
                    )}
                  </div>
                </TooltipProvider>
              </section>
            )}

            {hasContacts && (
              <>
                <Separator className="opacity-60" />
                <section id="contacts" className="space-y-3 scroll-mt-24">
                  <h2 className="text-sm font-semibold text-foreground">Связаться</h2>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    {phoneHref && psychologist.contactPhone && (
                      <PublicProfileContactPhone
                        displayText={psychologist.contactPhone}
                        href={phoneHref}
                        icon={<ContactBrandPhoneIcon className="shrink-0" />}
                        copyText={normalizePhoneForCopy(psychologist.contactPhone)}
                        copiedMessage="Номер скопирован"
                        copyLabel="Скопировать номер"
                        className="max-w-full"
                      />
                    )}
                    {telegramHref && psychologist.contactTelegram && (
                      <PublicProfileContactPhone
                        displayText={formatTelegramForDisplay(psychologist.contactTelegram)}
                        href={telegramHref}
                        icon={<ContactBrandTelegramIcon className="shrink-0" />}
                        title={psychologist.contactTelegram}
                        external
                        className="max-w-full"
                      />
                    )}
                    {whatsappHref && psychologist.contactWhatsapp && (
                      <PublicProfileContactPhone
                        displayText="WhatsApp"
                        href={whatsappHref}
                        icon={<ContactBrandWhatsappIcon className="shrink-0" />}
                        title={psychologist.contactWhatsapp}
                        external
                      />
                    )}
                    {viberHref && psychologist.contactViber && (
                      <PublicProfileContactPhone
                        displayText="Viber"
                        href={viberHref}
                        icon={<ContactBrandViberIcon className="shrink-0" />}
                        title={psychologist.contactViber}
                        external
                      />
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </article>
      ) : null}

      {!bookingEnabled && (
        <p className="text-balance text-center text-sm text-muted-foreground">
          Онлайн-запись через сервис сейчас недоступна. Свяжитесь с психологом по контактам выше.
        </p>
      )}

      {bookingEnabled && (
        <ClientBooking
          psychologistId={psychologist.id}
          psychologistName={fullName || "Психолог"}
          profilePath={profilePath}
        />
      )}

      {bookingEnabled && (
        <div className="surface-glass-dock fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.45)] sm:hidden">
          <Button className="w-full shadow-md" size="lg" asChild>
            <a href="#booking">Записаться на приём</a>
          </Button>
        </div>
      )}
    </div>
  );
}
