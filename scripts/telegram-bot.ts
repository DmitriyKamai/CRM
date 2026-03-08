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
          : res.status === 403
            ? "Ошибка доступа. Проверьте настройки сервера."
            : data?.message || "Не удалось привязать. Попробуйте ещё раз или создайте новую ссылку на сайте.";
    await ctx.reply(msg);
  } catch (e) {
    console.error("Claim link error:", e);
    await ctx.reply(
      "Сервер недоступен. Убедитесь, что приложение запущено (например, npm run dev) и CRM_APP_URL указан верно."
    );
  }
});

bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log("Telegram bot running (long polling). Stop with Ctrl+C.");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
