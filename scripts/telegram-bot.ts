/**
 * Telegram-бот для привязки аккаунта и (позже) уведомлений.
 * Запуск: npm run bot (или npx tsx scripts/telegram-bot.ts)
 * Нужны в .env: TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_SECRET, TELEGRAM_BOT_USERNAME (опционально).
 * CRM_APP_URL — базовый URL приложения для вызова API (по умолчанию http://localhost:3000).
 */

import "dotenv/config";
import { Telegraf } from "telegraf";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_BOT_SECRET;
const baseUrl = (process.env.CRM_APP_URL || "http://localhost:3000").replace(/\/$/, "");

if (!token) {
  console.error("Задайте TELEGRAM_BOT_TOKEN в .env");
  process.exit(1);
}

if (!secret) {
  console.error("Задайте TELEGRAM_BOT_SECRET в .env (любая случайная строка для подписи запросов бота к API)");
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start(async (ctx) => {
  const payload = ctx.startPayload?.trim() || "";
  if (!payload) {
    await ctx.reply(
      "Чтобы привязать аккаунт, откройте ссылку из настроек на сайте: Настройки → Аккаунты → Привязать Telegram."
    );
    return;
  }

  const chatId = ctx.chat?.id;
  const username = ctx.from?.username ?? undefined;

  if (!chatId) {
    await ctx.reply("Не удалось определить чат.");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/api/telegram/claim-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": secret
      },
      body: JSON.stringify({
        token: payload,
        chatId,
        username
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      await ctx.reply("Телеграм успешно привязан к вашему аккаунту. Можно вернуться на сайт.");
      return;
    }

    const msg =
      res.status === 404
        ? "Ссылка не найдена или уже использована."
        : res.status === 410
          ? "Время действия ссылки истекло. Создайте новую в настройках на сайте."
          : res.status === 409
            ? (data?.message as string) || "Этот Telegram уже привязан к другому пользователю. Отвяжите его в настройках того аккаунта."
            : res.status === 403
              ? "Ошибка доступа. Проверьте настройки сервера."
              : (data?.message as string) || "Не удалось привязать. Попробуйте ещё раз или создайте новую ссылку на сайте.";
    await ctx.reply(msg);
  } catch (e) {
    console.error("Claim link error:", e);
    await ctx.reply(
      "Сервер недоступен. Убедитесь, что приложение запущено (например, npm run dev) и CRM_APP_URL указан верно."
    );
  }
});

// Команда «Мои записи»
bot.command("myappointments", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  try {
    const res = await fetch(`${baseUrl}/api/telegram/my-appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": secret!
      },
      body: JSON.stringify({ chatId })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      await ctx.reply(data?.message || "Не удалось загрузить записи.").catch(() => {});
      return;
    }

    const appointments = data.appointments || [];
    const role = data.role;

    if (appointments.length === 0) {
      await ctx.reply("У вас нет предстоящих записей.").catch(() => {});
      return;
    }

    const lines = appointments.map((a: { start: string; clientName?: string; psychologistName?: string; status: string }, i: number) => {
      const d = new Date(a.start);
      const dateStr = d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
      const who = role === "psychologist" ? a.clientName : a.psychologistName;
      const statusLabel = a.status === "PENDING_CONFIRMATION" ? " (ожидает подтверждения)" : "";
      return `${i + 1}. ${dateStr} — ${who}${statusLabel}`;
    });

    const text = "Мои записи:\n\n" + lines.join("\n") + "\n\nДля записей «ожидает подтверждения» можно нажать «Подтвердить» или «Отменить». Для подтверждённых — только «Отменить».";

    const buttons = appointments.map((a: { id: string; start: string; status: string }) => {
      const timeStr = new Date(a.start).toLocaleString("ru-RU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      if (a.status === "PENDING_CONFIRMATION") {
        return [
          { text: `Подтвердить ${timeStr}`, callback_data: `confirm_my:${a.id}` },
          { text: `Отменить ${timeStr}`, callback_data: `cancel_my:${a.id}` }
        ];
      }
      return [
        { text: `Отменить ${timeStr}`, callback_data: `cancel_my:${a.id}` }
      ];
    });

    await ctx.reply(text, {
      reply_markup: { inline_keyboard: buttons }
    }).catch(() => {});
  } catch (e) {
    console.error("My appointments error:", e);
    await ctx.reply("Сервер недоступен. Попробуйте позже.").catch(() => {});
  }
});

// Кнопки «Подтвердить» / «Отменить» из «Мои записи» (confirm_my:id, cancel_my:id)
async function handleMyAppointmentAction(
  ctx: {
    match: string[];
    chat?: { id: number };
    callbackQuery?: { message?: unknown };
    answerCbQuery: () => Promise<unknown>;
    telegram: { editMessageText: (a: number, b: number | undefined, c: undefined, d: string) => Promise<unknown> };
    reply: (t: string) => Promise<unknown>;
  },
  appointmentId: string,
  action: "confirm" | "cancel"
) {
  const chatId = ctx.chat?.id;
  const msg = ctx.callbackQuery?.message;
  const messageId =
    msg !== undefined && msg !== null && typeof msg === "object" && "message_id" in msg
      ? (msg as { message_id: number }).message_id
      : undefined;

  if (!chatId) {
    await ctx.answerCbQuery();
    return;
  }

  await ctx.answerCbQuery();

  const endpoint = `${baseUrl}/api/telegram/appointments/${encodeURIComponent(appointmentId)}/action`;
  const body = { chatId, action: action === "confirm" ? "confirm" : "cancel" };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": secret!
      },
      body: JSON.stringify(body)
    });

    const result = await res.json().catch(() => ({}));

    if (res.ok && result.ok) {
      const newText = action === "confirm" ? "Запись подтверждена." : "Запись отменена.";
      if (messageId) {
        await ctx.telegram.editMessageText(chatId, messageId, undefined, newText).catch(() => {});
      } else {
        await ctx.reply(newText).catch(() => {});
      }
      return;
    }

    const errMsg = result?.message || (action === "confirm" ? "Не удалось подтвердить." : "Не удалось отменить.");
    if (messageId) {
      await ctx.telegram.editMessageText(chatId, messageId, undefined, `Ошибка: ${errMsg}`).catch(() => {});
    } else {
      await ctx.reply(`Ошибка: ${errMsg}`).catch(() => {});
    }
  } catch (e) {
    console.error("My appointment action error:", e);
    const msg = "Сервер недоступен. Попробуйте позже.";
    if (messageId) {
      await ctx.telegram.editMessageText(chatId, messageId, undefined, msg).catch(() => {});
    } else {
      await ctx.reply(msg).catch(() => {});
    }
  }
}

bot.action(/^confirm_my:(.+)$/, async (ctx) => {
  await handleMyAppointmentAction(ctx, ctx.match[1], "confirm");
});

bot.action(/^cancel_my:(.+)$/, async (ctx) => {
  await handleMyAppointmentAction(ctx, ctx.match[1], "cancel");
});

// Кнопки «Подтвердить» / «Отменить» по записи (callback_data: confirm:id или cancel:id)
bot.action(/^(confirm|cancel):(.+)$/, async (ctx) => {
  const data = ctx.match;
  const action = data[1] as "confirm" | "cancel";
  const appointmentId = data[2];
  const chatId = ctx.chat?.id;
  const msg = ctx.callbackQuery?.message;
  const messageId =
    msg !== undefined && msg !== null && typeof msg === "object" && "message_id" in msg
      ? (msg as { message_id: number }).message_id
      : undefined;

  if (!chatId || !appointmentId) {
    await ctx.answerCbQuery("Ошибка данных.");
    return;
  }

  await ctx.answerCbQuery();

  try {
    const res = await fetch(`${baseUrl}/api/telegram/appointments/${encodeURIComponent(appointmentId)}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": secret!
      },
      body: JSON.stringify({ action, chatId })
    });

    const result = await res.json().catch(() => ({}));

    if (res.ok && result.ok) {
      const newText = result.status === "SCHEDULED"
        ? "Запись подтверждена."
        : "Запись отменена.";
      if (messageId) {
        await ctx.telegram.editMessageText(chatId, messageId, undefined, newText).catch(() => {});
      }
      return;
    }

    const errMsg = result?.message || "Не удалось выполнить действие.";
    if (messageId) {
      await ctx.telegram.editMessageText(chatId, messageId, undefined, `Ошибка: ${errMsg}`).catch(() => {});
    } else {
      await ctx.reply(`Ошибка: ${errMsg}`).catch(() => {});
    }
  } catch (e) {
    console.error("Appointment action error:", e);
    const msg = "Сервер недоступен. Попробуйте позже.";
    if (messageId) {
      await ctx.telegram.editMessageText(chatId, messageId, undefined, msg).catch(() => {});
    } else {
      await ctx.reply(msg).catch(() => {});
    }
  }
});

bot.launch({ dropPendingUpdates: true }).then(async () => {
  await bot.telegram.setMyCommands([
    { command: "start", description: "Привязать аккаунт" },
    { command: "myappointments", description: "Мои записи" }
  ]).catch(() => {});
  console.log("Telegram bot running (long polling). Stop with Ctrl+C.");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
