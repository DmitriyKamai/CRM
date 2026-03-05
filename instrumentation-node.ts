/**
 * Только для Node.js runtime. Регистрирует обработчики необработанных исключений
 * и выхода процесса, чтобы в логах было видно причину падения.
 */
const log = (msg: string, extra?: string) => {
  const line = `[instrumentation] ${msg}${extra ? " " + extra : ""}`;
  console.error(line);
  if (process.stderr?.write) process.stderr.write(line + "\n", () => {});
};

if (typeof process !== "undefined") {
  process.on("uncaughtException", (err: Error) => {
    log("uncaughtException", err?.message ?? String(err));
    if (err?.stack) console.error(err.stack);
  });

  process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
    log(
      "unhandledRejection",
      reason instanceof Error ? reason.message : String(reason)
    );
    if (reason instanceof Error && reason.stack) console.error(reason.stack);
    promise.catch(() => {});
  });

  process.on("exit", (code: number | null, signal: string | null) => {
    log("exit", `code=${code} signal=${signal}`);
  });
}

export {};
