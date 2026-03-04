/**
 * Только для Node.js runtime. Регистрирует обработчики необработанных исключений.
 * Подключается из instrumentation.ts только когда NEXT_RUNTIME === "nodejs".
 */
if (typeof process !== "undefined") {
  process.on("uncaughtException", (err: Error) => {
    console.error("[instrumentation] uncaughtException:", err?.message ?? err);
    if (err?.stack) console.error(err.stack);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    console.error(
      "[instrumentation] unhandledRejection:",
      reason instanceof Error ? reason.message : reason
    );
    if (reason instanceof Error && reason.stack) console.error(reason.stack);
  });
}
