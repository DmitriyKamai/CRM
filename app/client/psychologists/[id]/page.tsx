import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ClientBooking } from "@/components/schedule/client-booking";

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
      <div className="space-y-4 rounded-lg border border-amber-700/60 bg-amber-950/40 p-6 text-amber-200">
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

  return (
    <div className="space-y-8">
      {/* Верхний блок‑профиль с большим фото из профессионального профиля */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-6 p-6 lg:flex-row">
          <div className="mx-auto max-h-[520px] max-w-full shrink-0 overflow-hidden rounded-2xl bg-muted lg:mx-0 lg:w-[380px] flex items-center justify-center">
            {psychologist.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={psychologist.profilePhotoUrl}
                alt={fullName || "Психолог"}
                className="h-auto max-h-[520px] w-auto max-w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <span className="text-5xl font-semibold text-muted-foreground">
                  {fullName
                    .split(" ")
                    .filter(Boolean)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                {fullName || "Психолог"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {psychologist.specialization && (
                  <span>
                    {psychologist.specialization === "psychotherapist"
                      ? "Врач-психотерапевт"
                      : psychologist.specialization === "psychiatrist"
                      ? "Психиатр"
                      : "Психолог"}
                  </span>
                )}
                {cityLine && (
                  <>
                    <span className="text-xs">•</span>
                    <span>{cityLine}</span>
                  </>
                )}
              </div>
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                О себе
              </h2>
              <div className="rounded-lg border bg-background/60 px-4 py-3 text-sm text-foreground/90 whitespace-pre-line">
                {psychologist.bio
                  ? psychologist.bio
                  : "Психолог ещё не заполнил информацию о себе."}
              </div>
            </section>
          </div>
        </div>
      </div>

      {(phoneHref || telegramHref || whatsappHref || viberHref) && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Контакты
          </h2>
          <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
            {phoneHref && psychologist.contactPhone && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Телефон</p>
                <a
                  href={phoneHref}
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  {psychologist.contactPhone}
                </a>
              </div>
            )}
            {telegramHref && psychologist.contactTelegram && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Telegram</p>
                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline-offset-2 hover:underline break-all"
                >
                  {psychologist.contactTelegram}
                </a>
              </div>
            )}
            {whatsappHref && psychologist.contactWhatsapp && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">WhatsApp</p>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline-offset-2 hover:underline break-all"
                >
                  {psychologist.contactWhatsapp}
                </a>
              </div>
            )}
            {viberHref && psychologist.contactViber && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Viber</p>
                <a
                  href={viberHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline-offset-2 hover:underline break-all"
                >
                  {psychologist.contactViber}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <ClientBooking
        psychologistId={psychologist.id}
        psychologistName={fullName}
      />
    </div>
  );
}

