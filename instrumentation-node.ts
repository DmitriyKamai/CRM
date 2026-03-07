/**
 * Только для Node.js runtime. Регистрирует обработчики необработанных исключений
 * и выхода процесса, чтобы в логах было видно причину падения.
 */
import { writeFileSync } from "fs";
import { join } from "path";

const crashLogPath = join(process.cwd(), "crash.log");

const log = (msg: string, extra?: string) => {
  const line = `[instrumentation] ${msg}${extra ? " " + extra : ""}`;
  console.error(line);
  try {
    writeFileSync(crashLogPath, `${new Date().toISOString()} ${line}\n`, { flag: "a" });
  } catch {
    // ignore
  }
};

if (typeof process !== "undefined") {
  process.on("uncaughtException", (err: Error) => {
    log("uncaughtException", err?.message ?? String(err));
    if (err?.stack) {
      console.error(err.stack);
      try {
        writeFileSync(crashLogPath, `${err.stack}\n`, { flag: "a" });
      } catch {
        // ignore
      }
    }
  });

  process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
    log(
      "unhandledRejection",
      reason instanceof Error ? reason.message : String(reason)
    );
    if (reason instanceof Error && reason.stack) {
      console.error(reason.stack);
      try {
        writeFileSync(crashLogPath, `${reason.stack}\n`, { flag: "a" });
      } catch {
        // ignore
      }
    }
    promise.catch(() => {});
  });

  process.on("exit", (code: number | null, signal: string | null) => {
    log("exit", `code=${code} signal=${signal}`);
  });
}

export {};
