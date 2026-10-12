import { describe, expect, it } from "vitest";
import { safeReturnUrl } from "./keycloak.service";
describe("Keycloak return location", () => {
  it("preserves an internal route", () => expect(safeReturnUrl("/admin/products?tab=1")).toBe("/admin/products?tab=1"));
  it.each([null, "https://evil.test", "//evil.test", "/\\evil.test", "/\n/evil.test"])("rejects an unsafe redirect %s", value => {
    expect(safeReturnUrl(value)).toBe("/shop");
  });
});
