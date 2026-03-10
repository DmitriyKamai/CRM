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
      <div className="space-y-8">
        {/* Верхний блок-профиль в стиле соцсети с большим фото из профессионального профиля */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-6 p-6 lg:flex-row">
            <div className="mx-auto max-h-[520px] w-full shrink-0 overflow-hidden rounded-2xl bg-muted lg:mx-0 lg:w-[380px] flex items-center justify-center">
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

              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                {(phoneHref || telegramHref || whatsappHref || viberHref) && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold tracking-tight text-foreground">
                      Контакты
                    </h2>
                    <div className="space-y-2 text-sm">
                      {phoneHref && (
                        <a
                          href={phoneHref}
                          className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                        >
                          <span>Телефон</span>
                          <span className="text-xs text-muted-foreground">
                            Набрать
                          </span>
                        </a>
                      )}
                      {telegramHref && (
                        <a
                          href={telegramHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                        >
                          <span>Telegram</span>
                          <span className="text-xs text-muted-foreground">
                            Открыть чат
                          </span>
                        </a>
                      )}
                      {whatsappHref && (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                        >
                          <span>WhatsApp</span>
                          <span className="text-xs text-muted-foreground">
                            Открыть чат
                          </span>
                        </a>
                      )}
                      {viberHref && (
                        <a
                          href={viberHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                        >
                          <span>Viber</span>
                          <span className="text-xs text-muted-foreground">
                            Открыть чат
                          </span>
                        </a>
                      )}
                    </div>
                  </section>
                )}

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
        </div>
            {(phoneHref || telegramHref || whatsappHref || viberHref) && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Контакты
                </h2>
                <div className="space-y-2 text-sm">
                  {phoneHref && (
                    <a
                      href={phoneHref}
                      className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      <span>Телефон</span>
                      <span className="text-xs text-muted-foreground">
                        Набрать
                      </span>
                    </a>
                  )}
                  {telegramHref && (
                    <a
                      href={telegramHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      <span>Telegram</span>
                      <span className="text-xs text-muted-foreground">
                        Открыть чат
                      </span>
                    </a>
                  )}
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      <span>WhatsApp</span>
                      <span className="text-xs text-muted-foreground">
                        Открыть чат
                      </span>
                    </a>
                  )}
                  {viberHref && (
                    <a
                      href={viberHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      <span>Viber</span>
                      <span className="text-xs text-muted-foreground">
                        Открыть чат
                      </span>
                    </a>
                  )}
                </div>
              </section>
            )}

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

