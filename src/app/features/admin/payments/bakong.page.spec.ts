import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { AdminApi } from "../api/admin.api";
import { BakongPage } from "./bakong.page";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";

function setup(id = "") {
  const api = {
    bakongCheck: vi.fn(() => of({ responseCode: 0, responseMessage: "Success", data: { hash: "proof" } })),
    paymentByTransaction: vi.fn(() => of({ id: 7, status: "PENDING" })),
    paymentByOrder: vi.fn(() => of({ id: 7, status: "PENDING" })),
    bakongQr: vi.fn(),
  };
  TestBed.configureTestingModule({ providers: [
    { provide: AdminApi, useValue: api },
    { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
  ] });
  return { api, page: TestBed.runInInjectionContext(() => new BakongPage()) };
}
describe("Bakong verification screen", () => {
  it("preserves Bakong response codes and transaction data through the real API client", () => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    const http = TestBed.inject(HttpTestingController);
    let result: unknown;
    TestBed.inject(AdminApi).bakongCheck("d".repeat(32)).subscribe(row => result = row);
    const request = http.expectOne("/api/v1/bakong/check-transaction");
    expect(request.request.body).toEqual({md5: "d".repeat(32)});
    const response = {responseCode: 1, errorCode: 1, responseMessage: "Not found", data: null};
    request.flush(response); expect(result).toEqual(response); http.verify();
  });
  it("rejects malformed MD5 before contacting the payment provider", () => {
    const {api,page} = setup(); page.md5 = "not-md5"; page.check();
    expect(api.bakongCheck).not.toHaveBeenCalled(); expect(page.error()).toContain("32-character");
  });
  it("keeps authoritative payment status unchanged after a successful raw provider check", () => {
    const {api,page} = setup("TX-7"); page.md5 = "a".repeat(32); page.check();
    expect(api.bakongCheck).toHaveBeenCalledWith("a".repeat(32));
    expect(page.payment()?.['status']).toBe("PENDING");
    expect(page.history()).toHaveLength(1);
    expect(page.dataText()).toContain("proof");
  });
  it("prevents duplicate verification while a request is running", () => {
    const {api,page} = setup(); const response = new Subject<any>();
    api.bakongCheck.mockReturnValue(response); page.md5 = "b".repeat(32); page.check(); page.check();
    expect(api.bakongCheck).toHaveBeenCalledTimes(1); response.complete();
  });
  it("clears an old response after a provider error and permits retry", () => {
    const {api,page} = setup(); page.md5 = "c".repeat(32); page.check();
    api.bakongCheck.mockReturnValue(throwError(() => ({ error: {message: "Provider unavailable"} })));
    page.check(); expect(page.result()).toBeNull(); expect(page.error()).toBe("Provider unavailable");
    expect(page.busy()).toBe(false); expect(page.history()).toHaveLength(1);
  });
  it("loads route transaction IDs as payment records, not MD5 hashes", () => {
    const {api,page} = setup("TX-7"); expect(api.paymentByTransaction).toHaveBeenCalledWith("TX-7");
    expect(page.md5).toBe("");
  });
  it("validates order lookup and QR inputs without making requests", () => {
    const {api,page} = setup(); page.orderId = "-1"; page.loadPayment();
    expect(api.paymentByOrder).not.toHaveBeenCalled(); page.loadQr(); expect(api.bakongQr).not.toHaveBeenCalled();
  });
});
