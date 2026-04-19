import axios from "axios";

export function log(...args: unknown[]): void {
  console.log("[signaloid]", ...args);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function annotate(err: unknown, context: string): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const body = JSON.stringify(err.response?.data ?? {});
    return new Error(`[${context}] HTTP ${status}: ${body}`);
  }
  return err instanceof Error
    ? new Error(`[${context}] ${err.message}`)
    : new Error(`[${context}] ${String(err)}`);
}
