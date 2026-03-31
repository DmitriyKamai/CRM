// Node.js-only instrumentation — dynamically imported from instrumentation.ts
// Only runs when NEXT_RUNTIME === "nodejs"
import { getDataEncryptionKey } from "./server-encryption/key-provider";

// #region agent log
export function setupNodeInstrumentation() {
  try {
    getDataEncryptionKey();
  } catch (e) {
    // Не падаем при старте: на Vercel без секрета иначе 500 на всех маршрутах.
    // Запись/расшифровка envelope всё равно потребует ключ в env.
    console.error(
      "[server-encryption] DATA_ENCRYPTION_KEY недоступен или неверен — задайте секрет в окружении (Vercel → Settings → Environment Variables).",
      e
    );
  }

  const heapStats = () => {
    const m = process.memoryUsage();
    const usedMb = Math.round(m.heapUsed / 1024 / 1024);
    const totalMb = Math.round(m.heapTotal / 1024 / 1024);
    const rssMb = Math.round(m.rss / 1024 / 1024);
    const pct = ((m.heapUsed / m.heapTotal) * 100).toFixed(1);
    return `heap=${usedMb}/${totalMb}MB(${pct}%) rss=${rssMb}MB`;
  };

  console.log(`[DBG] server-start pid=${process.pid} ${heapStats()} NODE_OPTIONS="${process.env.NODE_OPTIONS ?? ""}"`);

  const _realExit = process.exit.bind(process);
  (process as NodeJS.Process).exit = ((code?: number) => {
    const err = new Error(`process.exit(${code}) intercepted`);
    // Use stderr (synchronous) so log is never lost in buffered stdout pipe
    process.stderr.write(`[DBG] EXIT-INTERCEPT code=${code} pid=${process.pid} ${heapStats()}\n`);
    process.stderr.write(`[DBG] EXIT-STACK:\n${err.stack}\n`);
    _realExit(code as number);
  }) as typeof process.exit;

  process.on("uncaughtException", (err) => {
    console.log(`[DBG] uncaughtException: ${err?.message}\n${err?.stack}`);
  });
  process.on("unhandledRejection", (reason) => {
    console.log(`[DBG] unhandledRejection: ${String(reason)}`);
  });

  process.on("SIGINT", () => {
    console.log(`[DBG] SIGINT received pid=${process.pid} ${heapStats()}`);
    _realExit(0);
  });
  process.on("SIGTERM", () => {
    console.log(`[DBG] SIGTERM received pid=${process.pid} ${heapStats()}`);
    _realExit(0);
  });
  process.on("beforeExit", (code) => {
    console.log(`[DBG] beforeExit code=${code} pid=${process.pid} ${heapStats()}`);
  });
  process.on("exit", (code) => {
    // stderr is synchronous — visible even if process is terminating
    process.stderr.write(`[DBG] EXIT-EVENT code=${code} pid=${process.pid}\n`);
  });

  const heapTimer = setInterval(() => {
    const m = process.memoryUsage();
    const ratio = m.heapUsed / m.heapTotal;
    console.log(`[DBG] heap-tick pid=${process.pid} ${heapStats()} ratio=${(ratio * 100).toFixed(0)}%`);
  }, 5000);
  heapTimer.unref();
}
// #endregion
