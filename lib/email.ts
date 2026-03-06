import nodemailer from "nodemailer";

const defaultFrom = (() => {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const url = new URL(baseUrl);
    return `no-reply@${url.hostname}`;
  } catch {
    return "no-reply@example.com";
  }
})();

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
    : null;

type RegistrationInviteEmailParams = {
  to: string;
  clientName: string;
  psychologistName: string;
  inviteUrl: string;
};

export async function sendRegistrationInviteEmail({
  to,
  clientName,
  psychologistName,
  inviteUrl
}: RegistrationInviteEmailParams): Promise<void> {
  if (!transporter) {
    console.warn(
      "[email] SMTP не настроен, письмо приглашения не отправлено. Проверьте переменные SMTP_HOST, SMTP_USER, SMTP_PASS."
    );
    console.info("[email] Имитация письма:", {
      from: defaultFrom,
      to,
      subject: `Психолог ${psychologistName} приглашает вас зарегистрировать кабинет клиента`,
      inviteUrl
    });
    return;
  }

  const subject = `Психолог ${psychologistName} приглашает вас зарегистрировать кабинет клиента`;

  const text = [
    `Здравствуйте, ${clientName || "клиент"}!`,
    "",
    `Ваш психолог ${psychologistName} приглашает вас зарегистрироваться в личном кабинете клиента.`,
    "В кабинете вы сможете проходить тесты, просматривать результаты диагностики и управлять записями.",
    "",
    `Перейдите по ссылке для регистрации: ${inviteUrl}`,
    "",
    "Если вы не ожидали это письмо, просто проигнорируйте его."
  ].join("\n");

  await transporter.sendMail({
    from: defaultFrom,
    to,
    subject,
    text
  });
}

