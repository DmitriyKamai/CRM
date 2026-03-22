import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  MessageCircle,
  MessageSquare,
  Phone,
  Send
} from "lucide-react";

import { ClientBooking } from "@/components/schedule/client-booking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/db";
import { getPlatformModuleFlags } from "@/lib/platform-modules";
import { cn } from "@/lib/utils";

type ParamsPromise = { params: Promise<{ id: string }> };

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest ?? "").includes("NEXT_REDIRECT")
  );
}

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

export default async function PsychologistBookingPage({ params }: ParamsPromise) {
  const { id } = await params;

  type PsychologistBookingDTO = {
    id: string;
    firstName: string;
    lastName: string;
    country: string | null;
    city: string | null;
    specialization: string | null;
    bio: string | null;
    profilePhotoUrl: string | null;
    profilePublished: boolean;
    contactPhone: string | null;
    contactTelegram: string | null;
    contactViber: string | null;
    contactWhatsapp: string | null;
  };

  let psychologist: PsychologistBookingDTO | null = null;
  let errorMessage: string | null = null;

  try {
    psychologist = await prisma.psychologistProfile.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        country: true,
        city: true,
        specialization: true,
        bio: true,
        profilePhotoUrl: true,
        profilePublished: true,
        contactPhone: true,
        contactTelegram: true,
        contactViber: true,
        contactWhatsapp: true
      }
    });

    if (!psychologist || !psychologist.profilePublished) {
      notFound();
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("Psychologist booking page error:", err);
    errorMessage = err instanceof Error ? err.message : "Ошибка загрузки страницы";
  }

  if (errorMessage) {
    return (
      <div className="space-y-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-6 text-amber-900 dark:text-amber-200">
        <p className="font-medium">Ошибка загрузки страницы</p>
        <p className="text-sm">{errorMessage}</p>
        <Link href="/client/psychologists" className="text-sm underline">
          К списку психологов
        </Link>
      </div>
    );
  }

  if (!psychologist) {
    // Должно быть покрыто `notFound()`, но оставляем guard на случай непредвиденного null.
    return notFound();
  }

  const modules = await getPlatformModuleFlags();
  const bookingEnabled = modules.scheduling;

  const fullName = `${psychologist.firstName} ${psychologist.lastName}`.trim();
  const cityLine =
    psychologist.country || psychologist.city
      ? [psychologist.country, psychologist.city].filter(Boolean).join(", ")
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

  const hasContacts =
    !!(phoneHref || telegramHref || whatsappHref || viberHref);

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

  return (
    <div
      className={cn(
        "relative mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 sm:py-8",
        bookingEnabled && "pb-24 sm:pb-8"
      )}
    >
      <Link
        href="/client/psychologists"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        К списку психологов
      </Link>

      <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div
          className="h-24 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent sm:h-28"
          aria-hidden
        />

        <div className="flex flex-col gap-8 p-6 pt-2 lg:flex-row lg:items-start lg:gap-10 lg:p-8">
          <div className="mx-auto flex shrink-0 justify-center lg:mx-0 lg:-mt-16 lg:pt-0">
            <div
              className={cn(
                "relative overflow-hidden border-4 border-background shadow-lg ring-1 ring-border/50",
                "h-36 w-36 rounded-full sm:h-40 sm:w-40",
                "lg:h-[22rem] lg:w-[17rem] lg:rounded-3xl lg:border-2"
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
                  className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 via-primary/20 to-muted/80"
                  aria-hidden
                >
                  <span className="text-3xl font-semibold tracking-tight text-primary/90 sm:text-4xl">
                    {initials || "—"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-6 lg:pt-2">
            <header className="space-y-3 text-center lg:text-left">
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {fullName || "Психолог"}
              </h1>
              {(specializationLabel || cityLine) && (
                <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  {specializationLabel && (
                    <Badge variant="secondary" className="font-medium">
                      {specializationLabel}
                    </Badge>
                  )}
                  {cityLine && (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      {cityLine}
                    </Badge>
                  )}
                </div>
              )}
            </header>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">О себе</h2>
              <div className="rounded-xl bg-muted/50 px-4 py-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                {psychologist.bio
                  ? psychologist.bio
                  : "Психолог ещё не заполнил информацию о себе."}
              </div>
            </section>

            {hasContacts && (
              <>
                <Separator className="opacity-60" />
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    Связаться
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {phoneHref && psychologist.contactPhone && (
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a href={phoneHref}>
                          <Phone className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="max-w-[200px] truncate sm:max-w-none">
                            {psychologist.contactPhone}
                          </span>
                        </a>
                      </Button>
                    )}
                    {telegramHref && psychologist.contactTelegram && (
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a
                          href={telegramHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={psychologist.contactTelegram}
                        >
                          <Send className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="max-w-[160px] truncate sm:max-w-[220px]">
                            {psychologist.contactTelegram}
                          </span>
                        </a>
                      </Button>
                    )}
                    {whatsappHref && psychologist.contactWhatsapp && (
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={psychologist.contactWhatsapp}
                        >
                          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                    {viberHref && psychologist.contactViber && (
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <a
                          href={viberHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={psychologist.contactViber}
                        >
                          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="max-w-[140px] truncate sm:max-w-none">
                            Viber
                          </span>
                        </a>
                      </Button>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </article>

      {!bookingEnabled && (
        <p className="text-balance text-center text-sm text-muted-foreground">
          Онлайн-запись через сервис сейчас недоступна. Свяжитесь с психологом
          по контактам выше.
        </p>
      )}

      {bookingEnabled && (
        <ClientBooking
          psychologistId={psychologist.id}
          psychologistName={fullName || "Психолог"}
        />
      )}

      {bookingEnabled && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 sm:hidden">
          <Button className="w-full shadow-md" size="lg" asChild>
            <a href="#booking">Записаться на приём</a>
          </Button>
        </div>
      )}
    </div>
  );
}

