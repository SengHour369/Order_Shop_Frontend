import { TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { AuthService } from "../auth/auth.service";
import { authInterceptor } from "../auth/auth.interceptor";
import { CartApi } from "../../features/cart/cart.api";
import { CatalogApi } from "../../features/catalog/catalog.api";
import { OrdersApi } from "../../features/orders/orders.api";
import { AddressesApi } from "../../features/addresses/addresses.api";
import { NotificationsApi } from "../../features/notifications/notifications.api";
import { PaymentsApi } from "../../features/payments/payments.api";
import { ProfileApi } from "../../features/account/profile.api";

const session = {
  id: 7,
  access_token: "access",
  refresh_token: "refresh",
  username: "shopper",
  email: "shopper@example.test",
  role: "USER",
};

describe("Backend contracts", () => {
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => http.verify());

  it("preserves the login DTO field casing", () => {
    auth.login("shopper", "password").subscribe();
    const request = http.expectOne("/api/v1/public/session/login");
    expect(request.request.body).toEqual({
      CriteriaValue: "shopper",
      Password: "password",
    });
    expect(request.request.headers.has("Authorization")).toBe(false);
    request.flush(session);
    expect(auth.userId()).toBe(7);
  });

  it("adds a SKU with a server-owned price and authenticated user", () => {
    auth.accept(session);
    TestBed.inject(CartApi).add(42, 2).subscribe();
    const request = http.expectOne("/api/v1/cart/user/id/items?userId=7");
    expect(request.request.body).toEqual({ product_id: 42, quantity: 2 });
    expect(request.request.headers.get("Authorization")).toBe("Bearer access");
    request.flush({ code: "200", data: { items: [] } });
  });

  it("uses one-based catalog pagination and search criteria", () => {
    auth.accept(session);
    TestBed.inject(CatalogApi).list(2, "tea").subscribe();
    const request = http.expectOne("/api/v1/products/get/all");
    expect(request.request.body).toEqual({
      page: 2,
      size: 12,
      criteria_type: 1,
      criteria_value: "tea",
      is_active: true,
    });
    request.flush({ code: "200", data: { payload: [] } });
  });

  it("unwraps each address envelope", () => {
    auth.accept(session);
    let ids: number[] = [];
    TestBed.inject(AddressesApi)
        .list()
        .subscribe((rows) => (ids = rows.map((r) => r.id)));
    http
        .expectOne("/api/v1/addresses/user/7")
        .flush([{ code: "200", data: { id: 9 } }]);
    expect(ids).toEqual([9]);
  });

  it("sends checkout identity without client totals or stock", () => {
    auth.accept(session);
    const body = {
      address_id: 9,
      payment_method: "BAKONG",
      currency: "USD",
      checkout_key: "same-attempt",
    };
    TestBed.inject(OrdersApi).checkout(body).subscribe();
    const request = http.expectOne("/api/v1/orders/user/from-cart?userId=7");
    expect(request.request.body).toEqual(body);
    request.flush({ code: "200", data: { id: 1, status: "CHECKOUT_PENDING" } });
  });

  it("shares refresh between concurrent expired requests", () => {
    auth.accept(session);
    const catalog = TestBed.inject(CatalogApi);
    catalog.list().subscribe();
    catalog.list(2).subscribe();
    const expired = http.match("/api/v1/products/get/all");
    for (const r of expired)
      r.flush({}, { status: 401, statusText: "Unauthorized" });
    const refresh = http.expectOne("/api/v1/public/refresh");
    expect(refresh.request.body).toEqual({ refreshToken: "refresh" });
    refresh.flush({ ...session, access_token: "renewed" });
    const retried = http.match("/api/v1/products/get/all");
    expect(retried.length).toBe(2);
    for (const r of retried) {
      expect(r.request.headers.get("Authorization")).toBe("Bearer renewed");
      r.flush({ code: "200", data: { payload: [] } });
    }
  });

  it("authorizes logout because the gateway protects it", () => {
    auth.accept(session);
    auth.logout().subscribe();
    const r = http.expectOne("/api/v1/public/logout");
    expect(r.request.headers.get("Authorization")).toBe("Bearer access");
    r.flush({});
  });

  it("keeps the renewed session when a retried business request fails", () => {
    auth.accept(session);
    let failed = false;
    TestBed.inject(CatalogApi)
        .list()
        .subscribe({ error: () => (failed = true) });
    http
        .expectOne("/api/v1/products/get/all")
        .flush({}, { status: 401, statusText: "Unauthorized" });
    http
        .expectOne("/api/v1/public/refresh")
        .flush({ ...session, access_token: "renewed" });
    http
        .expectOne("/api/v1/products/get/all")
        .flush({}, { status: 500, statusText: "Server error" });
    expect(failed).toBe(true);
    expect(auth.session()?.access_token).toBe("renewed");
  });

  it("does not send credentials to external URLs", () => {
    auth.accept(session);
    TestBed.inject(HttpClient).get("https://example.test/image").subscribe();
    const r = http.expectOne("https://example.test/image");
    expect(r.request.headers.has("Authorization")).toBe(false);
    r.flush({});
  });

  it("calls the remaining shop routes", () => {
    auth.accept(session);
    const cart = TestBed.inject(CartApi);
    const catalog = TestBed.inject(CatalogApi);
    const addresses = TestBed.inject(AddressesApi);
    const notes = TestBed.inject(NotificationsApi);
    const payments = TestBed.inject(PaymentsApi);
    const profile = TestBed.inject(ProfileApi);
    cart.current().subscribe();
    cart.clear().subscribe();
    addresses.page(1, 5).subscribe();
    notes.get(4).subscribe();
    catalog.activePromotions().subscribe();
    catalog.promotionProducts(3).subscribe();
    catalog.attributes().subscribe();
    catalog.attribute(2).subscribe();
    catalog.attributeByName("Color").subscribe();
    catalog.attributeValues(2).subscribe();
    catalog.attributeValue(2, "Red").subscribe();
    payments.payments().subscribe();
    payments.payment(9).subscribe();
    payments.history(0, 10, "SUCCESS").subscribe();
    payments.byNumber("TX-1").subscribe();
    payments.statusHistory(6).subscribe();
    auth.checkUser("shopper@example.test").subscribe();
    auth
        .registerAccount({
          username: "ada",
          password: "secret",
          email: "ada@example.test",
          phone: "1",
          full_name: "Ada",
        })
        .subscribe();
    const flush = (url: string) =>
        http
            .expectOne(url)
            .flush({ code: "200", data: { content: [], items: [] } });
    flush("/api/v1/cart/user/id?userId=7");
    flush("/api/v1/cart/user/userId/clear?userId=7");
    http
        .expectOne("/api/v1/addresses/user/7/paged?page=1&size=5&sort=id,desc")
        .flush({ content: [], number: 1, totalPages: 0, totalElements: 0 });
    flush("/api/notifications/4");
    flush("/api/v1/promotions/active?page=1&size=20");
    flush("/api/v1/promotions/3/products?page=1&size=20");
    http.expectOne("/api/v1/attributes").flush([]);
    flush("/api/v1/attributes/2");
    flush("/api/v1/attributes/name/Color");
    http.expectOne("/api/v1/attribute-values/attribute/2").flush([]);
    flush("/api/v1/attribute-values?attributeId=2&value=Red");
    flush("/api/v1/payments/user/id?userId=7");
    flush("/api/v1/payments/user/detail?userId=7&paymentId=9");
    flush(
        "/api/v1/payments/user/history?userId=7&page=0&size=10&sort=paymentDate,desc&status=SUCCESS",
    );
    flush("/api/v1/payment-transactions/no/TX-1");
    flush("/api/v1/payment-transactions/6/status-history");
    flush("/api/v1/public/check-user?email=shopper@example.test");
    const register = http.expectOne("/api/v1/public/accounts/register");
    expect(register.request.body).toEqual({
      username: "ada",
      password: "secret",
      email: "ada@example.test",
      phone: "1",
      full_name: "Ada",
    });
    register.flush({ code: "200", data: {} });
  });
});

import { HttpClient } from "@angular/common/http";