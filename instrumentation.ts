/**
 * Запускается при старте Next.js. В Node.js подключает логирование необработанных
 * исключений и отказов промисов. В Edge Runtime не выполняет ничего.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
