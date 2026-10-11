import { Envelope } from "./models";

/** HTTP 200 can still contain a business error in the legacy services. */
export function unwrap<T>(response: Envelope<T>): T {
  const result = response as Envelope<T> & {
    success?: boolean;
    status?: number;
  };
  if (
    Number(result.code) >= 400 ||
    result.success === false ||
    Number(result.status) >= 400
  ) {
    throw new Error(result.message || "The request could not be completed.");
  }
  return result.data;
}
