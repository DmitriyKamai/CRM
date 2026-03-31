import { AsyncLocalStorage } from "node:async_hooks";

type Store = { headers: Record<string, string> };

const storage = new AsyncLocalStorage<Store>();

/** Оборачивает вызов, чтобы в jwt callback читать заголовки запроса (UA, IP, гео-хедеры). */
export async function runWithAuthRequestContext<T>(
  headers: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  return storage.run({ headers }, fn);
}

export function getAuthRequestHeaders(): Record<string, string> | null {
  return storage.getStore()?.headers ?? null;
}
