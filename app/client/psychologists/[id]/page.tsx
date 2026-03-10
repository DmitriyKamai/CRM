import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
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

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      redirect(
        `/auth/login?callbackUrl=/client/psychologists/${encodeURIComponent(id)}`
      );
    }

    if ((session.user as any).role !== "CLIENT") {
      redirect("/");
    }

    const psychologist = await prisma.psychologistProfile.findUnique({
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
        profilePhotoPublished: true,
        contactPhone: true,
        contactTelegram: true,
        contactViber: true,
        contactWhatsapp: true
      }
    });

    if (!psychologist || !psychologist.profilePhotoPublished) {
      redirect("/client/psychologists");
    }

    const fullName = `${psychologist.lastName} ${psychologist.firstName}`.trim();
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
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
              {psychologist.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={psychologist.profilePhotoUrl}
                  alt={fullName || "Психолог"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold">
                  {fullName
                    .split(" ")
                    .filter(Boolean)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h1 className="text-xl font-semibold leading-tight">
                  {fullName || "Психолог"}
                </h1>
                {psychologist.specialization && (
                  <p className="text-sm text-muted-foreground">
                    {psychologist.specialization === "psychotherapist"
                      ? "Врач-психотерапевт"
                      : psychologist.specialization === "psychiatrist"
                      ? "Психиатр"
                      : "Психолог"}
                  </p>
                )}
                {cityLine && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {cityLine}
                  </p>
                )}
              </div>

              {psychologist.bio && (
                <p className="text-sm text-foreground/90 whitespace-pre-line">
                  {psychologist.bio}
                </p>
              )}

              {(phoneHref || telegramHref || whatsappHref || viberHref) && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Контакты для связи
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {phoneHref && (
                      <a
                        href={phoneHref}
                        className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                      >
                        Телефон
                      </a>
                    )}
                    {telegramHref && (
                      <a
                        href={telegramHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                      >
                        Telegram
                      </a>
                    )}
                    {whatsappHref && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                      >
                        WhatsApp
                      </a>
                    )}
                    {viberHref && (
                      <a
                        href={viberHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                      >
                        Viber
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ClientBooking
          psychologistId={psychologist.id}
          psychologistName={fullName}
        />
      </div>
    );
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("Psychologist booking page error:", err);
    return (
      <div className="space-y-4 rounded-lg border border-amber-700/60 bg-amber-950/40 p-6 text-amber-200">
        <p className="font-medium">Ошибка загрузки страницы</p>
        <p className="text-sm">
          {err instanceof Error
            ? err.message
            : "Попробуйте обновить страницу или перейти к списку психологов."}
        </p>
        <a href="/client/psychologists" className="text-sm underline">
          К списку психологов
        </a>
      </div>
    );
  }
}

