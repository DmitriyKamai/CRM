/**
 * Отправка сообщений в Telegram от имени бота (вызывается из API приложения).
 * TELEGRAM_BOT_TOKEN должен быть задан в .env.
 */

const BASE = "https://api.telegram.org/bot";
const FETCH_TIMEOUT_MS = 8_000;

let _tokenWarnedOnce = false;
function getToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? null;
  if (!token && !_tokenWarnedOnce) {
    _tokenWarnedOnce = true;
    console.warn("[telegram] TELEGRAM_BOT_TOKEN не задан — уведомления в Telegram не отправляются.");
  }
  return token;
}

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

export type InlineButton = { text: string; callback_data: string };

/**
 * Отправить текстовое сообщение в чат.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parse_mode?: "HTML" | "Markdown" }
): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  const res = await fetchWithTimeout(`${BASE}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode,
      disable_web_page_preview: true
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[telegram sendMessage]", res.status, err);
    return false;
  }
  return true;
}

/**
 * Отправить сообщение с inline-кнопками (callback_data до 64 байт).
 */
export async function sendTelegramMessageWithButtons(
  chatId: string,
  text: string,
  buttons: InlineButton[][]
): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  const res = await fetchWithTimeout(`${BASE}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: buttons },
      disable_web_page_preview: true
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[telegram sendMessage with buttons]", res.status, err);
    return false;
  }
  return true;
}

/**
 * Уведомление психологу о новой записи с кнопками «Подтвердить» / «Отменить».
 * callback_data: confirm:<id> / cancel:<id> (id — appointment id, до 64 байт суммарно).
 */
export async function sendNewAppointmentToPsychologist(
  chatId: string,
  appointmentId: string,
  clientName: string,
  dateStr: string
): Promise<boolean> {
  const text = `Новая запись на приём\n\nКлиент: ${clientName}\nДата и время: ${dateStr}\n\nПодтвердите или отмените запись:`;
  const confirmData = `confirm:${appointmentId}`;
  const cancelData = `cancel:${appointmentId}`;
  if (confirmData.length > 64 || cancelData.length > 64) return false;

  return sendTelegramMessageWithButtons(chatId, text, [
    [
      { text: "✅ Подтвердить", callback_data: confirmData },
      { text: "❌ Отменить", callback_data: cancelData }
    ]
  ]);
}

/**
 * Уведомление клиенту о предложенной записи с кнопками «Подтвердить» / «Отменить».
 * Отправляется когда психолог предлагает клиенту запись (proposedByPsychologist = true).
 */
export async function sendAppointmentProposalToClient(
  chatId: string,
  appointmentId: string,
  psychologistName: string,
  dateStr: string
): Promise<boolean> {
  const text = `📅 Предложена запись на приём\n\nПсихолог: ${psychologistName}\nДата и время: ${dateStr}\n\nПодтвердите или отмените запись:`;
  const confirmData = `confirm:${appointmentId}`;
  const cancelData = `cancel:${appointmentId}`;
  if (confirmData.length > 64 || cancelData.length > 64) return false;

  return sendTelegramMessageWithButtons(chatId, text, [
    [
      { text: "✅ Подтвердить", callback_data: confirmData },
      { text: "❌ Отменить", callback_data: cancelData }
    ]
  ]);
}

/**
 * Редактировать текст сообщения (после нажатия кнопки).
 */
export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string
): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  const res = await fetchWithTimeout(`${BASE}${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[telegram editMessageText]", res.status, err);
    return false;
  }
  return true;
}
