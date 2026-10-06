/**
 * Transport-level failure. A thrown FavritError
 * (reason "network") means unreachable; null from a client method always
 * means the platform answered: absent. Add further reasons ONLY for
 * protocol failures callers must discriminate, and document each.
 */
export type FailureReason = "network";

export class FavritError extends Error {
  constructor(readonly reason: FailureReason, message: string) {
    super(message);
    this.name = "FavritError";
  }
}

export function isTransportFailure(error: unknown): boolean {
  return error instanceof Error || typeof DOMException === "function" && error instanceof DOMException;
}
