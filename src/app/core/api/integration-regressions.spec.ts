import { TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { Subject } from "rxjs";
import { ApiClient } from "./api-client";
import { AuthService } from "../auth/auth.service";
import { authInterceptor } from "../auth/auth.interceptor";
import { CatalogApi } from "../../features/catalog/catalog.api";
import { ProfileApi } from "../../features/account/profile.api";
import { AddressesApi } from "../../features/addresses/addresses.api";
import { AfterSalesApi } from "../../features/after-sales/after-sales.api";
import { PageState } from "../../shared/utils/page-state";

const session = {
  id: 7,
  username: "test",
  email: "test@example.test",
  role: "USER",
  access_token: "old",
  refresh_token: "refresh",
};

describe("Integration regressions", () => {
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
    auth.accept(session);
  });
  afterEach(() => http.verify());

  it("resolves a category name to its ID before filtering products", () => {
    TestBed.inject(CatalogApi).category("Home & Living", 2).subscribe();
    const lookup = http.expectOne(
      "/api/v1/categories/name/?name=Home%20%26%20Living",
    );
    expect(lookup.request.method).toBe("POST");
    lookup.flush({ code: "200", data: { id: 14 } });
    const products = http.expectOne("/api/v1/products/get/all");
    expect(products.request.body).toEqual({
      criteria_type: 3,
      criteria_value: "14",
      is_active: true,
      page: 2,
      size: 12,
    });
    products.flush({ code: "200", data: { payload: [] } });
  });

  it("preserves promotion totals when adapting Spring pagination", () => {
    let total = 0;
    TestBed.inject(CatalogApi)
      .promotionPage(8, 2)
      .subscribe((page) => (total = page.total_items));
    http
      .expectOne("/api/v1/promotions/8/products?page=2&size=12")
      .flush({
        code: "200",
        data: { content: [], totalElements: 33, totalPages: 3 },
      });
    expect(total).toBe(33);
  });

  it("does not treat an HTTP 200 business error as success", () => {
    let error = "";
    TestBed.inject(ApiClient)
      .data("/api/v1/test")
      .subscribe({ error: (value) => (error = value.message) });
    http
      .expectOne("/api/v1/test")
      .flush({
        success: false,
        status: 409,
        message: "Stock changed",
        data: null,
      });
    expect(error).toBe("Stock changed");
  });

  it("does not copy a password returned by the legacy profile response", () => {
    let profile: unknown;
    TestBed.inject(ProfileApi)
      .get()
      .subscribe((value) => (profile = value));
    http
      .expectOne("/api/v1/user/id/user?id=7")
      .flush({
        code: "200",
        data: {
          id: 7,
          fullName: "Test Shopper",
          password: "must-not-propagate",
        },
      });
    expect(profile).not.toHaveProperty("password");
    expect(profile).toHaveProperty("fullName", "Test Shopper");
  });

  it("uses multipart profile upload without forcing a JSON content type", () => {
    const file = new File(["image"], "avatar.png", { type: "image/png" });
    TestBed.inject(ProfileApi).photo(file).subscribe();
    const upload = http.expectOne("/api/v1/user/id/image?id=7");
    expect(upload.request.body.get("file")).toBe(file);
    expect(upload.request.headers.has("Content-Type")).toBe(false);
    upload.flush({ code: "200", data: {} });
  });

  it("rejects failed address updates instead of showing a success message", () => {
    let error = "";
    const body = {
      address_line1: "Test Street",
      city: "Test City",
      zip_code: "12000",
      country: "Cambodia",
      is_default: false,
    };
    TestBed.inject(AddressesApi)
      .update(2, body)
      .subscribe({ error: (value) => (error = value.message) });
    const request = http.expectOne("/api/v1/addresses/2/user/7");
    expect(request.request.method).toBe("PUT");
    expect(request.request.body).toEqual(body);
    request.flush({ code: "403", message: "Address is not yours", data: null });
    expect(error).toBe("Address is not yours");
  });

  it("uses the signed-in customer identity for return requests", () => {
    TestBed.inject(AfterSalesApi)
      .requestReturn({
        order_id: 11,
        product_id: 42,
        return_type: "REFUND",
        reason: "Damaged item",
        amount: 10,
      })
      .subscribe();
    const request = http.expectOne("/api/v1/returns/user");
    expect(request.request.body.customer_id).toBe(7);
    expect(request.request.body.return_type).toBe("REFUND");
    request.flush({ code: "200", data: { return_id: "RET-1" } });
  });

  it("keeps the account signed in after a forbidden request", () => {
    TestBed.inject(CatalogApi)
      .list()
      .subscribe({ error: () => {} });
    http
      .expectOne("/api/v1/products/get/all")
      .flush({}, { status: 403, statusText: "Forbidden" });
    expect(auth.session()?.id).toBe(7);
    http.expectNone("/api/v1/public/refresh");
  });

  it("does not restore a session after logout during token refresh", () => {
    TestBed.inject(CatalogApi)
      .list()
      .subscribe({ error: () => {} });
    http
      .expectOne("/api/v1/products/get/all")
      .flush({}, { status: 401, statusText: "Unauthorized" });
    const refresh = http.expectOne("/api/v1/public/refresh");
    auth.clear();
    refresh.flush({ ...session, access_token: "late-token" });
    expect(auth.session()).toBeNull();
    http.expectNone("/api/v1/products/get/all");
  });

  it("preserves a new login when an old refresh request fails", () => {
    TestBed.inject(CatalogApi)
      .list()
      .subscribe({ error: () => {} });
    http
      .expectOne("/api/v1/products/get/all")
      .flush({}, { status: 401, statusText: "Unauthorized" });
    const refresh = http.expectOne("/api/v1/public/refresh");
    auth.accept({
      ...session,
      id: 8,
      refresh_token: "new-refresh",
      access_token: "new-token",
    });
    refresh.flush({}, { status: 401, statusText: "Unauthorized" });
    expect(auth.session()?.id).toBe(8);
  });

  it("cancels an old search so late results cannot overwrite the new search", () => {
    const state = TestBed.runInInjectionContext(() => new PageState());
    const first = new Subject<string>();
    const second = new Subject<string>();
    let visible = "";
    state.run(first, (value) => (visible = value));
    state.run(second, (value) => (visible = value), true);
    second.next("new products");
    first.next("old products");
    expect(visible).toBe("new products");
    expect(first.observed).toBe(false);
  });
});
