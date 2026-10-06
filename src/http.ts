import { isTransportFailure } from "./error.js";

export const USER_AGENT = "favrit/0.1";

export interface ApiResult<T> {
  readonly ok: true;
  readonly value: T;
}

export interface ApiFailure {
  readonly ok: false;
  readonly kind: "http" | "network" | "parse";
  readonly status: number;
  readonly body: string;
}

export type FetchApiResult<T> = ApiResult<T> | ApiFailure;

/** TODO: point at the platform's real read surface. */
export async function getJson<T>(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchApiResult<T>> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (!isTransportFailure(error)) throw error;
    return {
      ok: false,
      kind: "network",
      status: 0,
      body: error instanceof Error ? error.message : String(error),
    };
  }
  const text = await response.text();
  if (!response.ok) {
    return { ok: false, kind: "http", status: response.status, body: text.slice(0, 300) };
  }
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, kind: "parse", status: response.status, body: text.slice(0, 300) };
  }
}
