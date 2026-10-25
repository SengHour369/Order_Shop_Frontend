import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { AdminApi, Row, unwrapPage } from "./admin.api";
describe("Admin API contracts", () => {
  let api: AdminApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads every transaction page with the customer criterion for complete filters and totals', () => {
    let records: Row[] = [];
    api.allTransactions(' 7 ').subscribe(rows => records = rows);
    const first = http.expectOne('/api/v1/payment-transactions/get/all');
    expect(first.request.body).toEqual({ page: 1, size: 100, criteria_type: 2, criteria_value: '7' });
    first.flush({ code: '200', data: { payload: [{ id: 1 }], total_items: 2, total_pages: 2, current_page: 1 } });
    const second = http.expectOne('/api/v1/payment-transactions/get/all');
    expect(second.request.body).toEqual({ page: 2, size: 100, criteria_type: 2, criteria_value: '7' });
    second.flush({ code: '200', data: { payload: [{ id: 2 }], total_items: 2, total_pages: 2, current_page: 2 } });
    expect(records).toEqual([{ id: 1 }, { id: 2 }]);
  });
  it('reads all order pages before applying combined admin filters',()=>{let result:Row[]=[];api.allOrders('PENDING',true).subscribe(rows=>result=rows);const first=http.expectOne('/api/v1/orders/get/all');expect(first.request.body).toEqual({page:1,size:100,criteria_type:5,criteria_value:'GUEST:PENDING'});first.flush({code:'200',data:{payload:[{id:1}],total_items:2,total_pages:2,current_page:1}});const second=http.expectOne('/api/v1/orders/get/all');expect(second.request.body.page).toBe(2);second.flush({code:'200',data:{payload:[{id:2}],total_items:2,total_pages:2,current_page:2}});expect(result).toEqual([{id:1},{id:2}]);});
  it('filters customer order history on the server with explicit pagination', () => {
    api.customerOrders(7, 2, 10).subscribe();
    const request = http.expectOne('/api/v1/orders/get/all');
    expect(request.request.body).toEqual({ page: 2, size: 10, criteria_type: 1, criteria_value: '7' });
    request.flush({ code: '200', data: { payload: [], total_items: 0, total_pages: 1, current_page: 2 } });
  });
  it("drops password fields from legacy customer responses", () => {
    let rows: Row[] = [];
    api.customers().subscribe((result) => (rows = result.items));
    http
      .expectOne("/api/v1/user/All")
      .flush([
        {
          code: "200",
          data: { id: 7, username: "test", password: "private-value" },
        },
      ]);
    expect(rows).toEqual([{ id: 7, username: "test" }]);
  });
  it("rejects business failures inside paginated envelopes", () => {
    expect(() =>
      unwrapPage({
        content: [{ code: "403", message: "Denied", data: null }],
        totalElements: 1,
        totalPages: 1,
      }),
    ).toThrow("Denied");
  });
  it("combines product search and status before pagination", () => {
    api.products(3, "phone", 20, "inactive").subscribe();
    const request = http.expectOne("/api/v1/products/get/all");
    expect(request.request.body).toEqual({
      page: 3,
      size: 20,
      criteria_type: 1,
      criteria_value: "phone",
      is_active: false,
    });
    request.flush({
      code: "200",
      data: { payload: [], total_items: 0, total_pages: 0, current_page: 3 },
    });
  });
  it("uses direct detail lookups beyond the first list page", () => {
    api.category(901).subscribe();
    api.brand(902).subscribe();
    api.inventoryItem(903).subscribe();
    http
      .expectOne("/api/v1/categories/id/get/?id=901")
      .flush({ code: "200", data: { id: 901 } });
    const brand = http.expectOne("/api/v1/subcategories/get/all");
    expect(brand.request.body).toEqual({
      page: 1,
      size: 1,
      criteria_type: 4,
      criteria_value: "902",
    });
    brand.flush({ code: "200", data: { id: 902 } });
    http
      .expectOne("/api/v1/inventory/id/?id=903")
      .flush({ code: "200", data: { id: 903 } });
  });
  it("loads all selector pages and unwraps nested envelopes", () => {
    let rows: Row[] = [];
    api.allCategories().subscribe((value) => (rows = value));
    http
      .expectOne("/api/v1/categories/get/all?page=0&size=100&sort=name,asc")
      .flush({
        content: [{ code: "200", data: { id: 1 } }],
        number: 0,
        totalPages: 2,
        totalElements: 2,
      });
    http
      .expectOne("/api/v1/categories/get/all?page=1&size=100&sort=name,asc")
      .flush({
        content: [{ code: "200", data: { id: 2 } }],
        number: 1,
        totalPages: 2,
        totalElements: 2,
      });
    expect(rows.map((row) => row["id"])).toEqual([1, 2]);
  });
  it("uses aggregate reports and preserves currency", () => {
    let currency: string | null = null;
    api
      .monthlyReport("payment", 2026)
      .subscribe((rows) => (currency = rows[0].currency));
    http.expectOne("/api/v1/payments/reports/monthly?year=2026").flush({
      code: "200",
      data: [{ month: 1, amount: 5000, count: 2, currency: "KHR" }],
    });
    expect(currency).toBe("KHR");
  });
  it("handles unsaved settings and semantic errors", () => {
    let value: unknown = "not called";
    api.settings().subscribe((settings) => (value = settings));
    http
      .expectOne("/api/v1/admin/settings")
      .flush({ success: true, data: null });
    expect(value).toBeNull();
    let message = "";
    api.settings().subscribe({ error: (error) => (message = error.message) });
    http
      .expectOne("/api/v1/admin/settings")
      .flush({ success: false, message: "Denied", status: 403, data: null });
    expect(message).toBe("Denied");
  });
  it("normalizes the one-based custom page contract", () => {
    expect(
      unwrapPage({
        code: "200",
        data: {
          payload: [{ id: 1 }],
          total_items: 21,
          total_pages: 3,
          current_page: 2,
        },
      }),
    ).toEqual({ items: [{ id: 1 }], total: 21, pages: 3, page: 2 });
  });
  it("calls the remaining public admin routes", () => {
    const ok = {
      code: "200",
      data: { content: [], totalElements: 0, totalPages: 1, number: 0 },
    };
    const one = { code: "200", data: { id: 1 } };
    api.permissionRow("functions", 4).subscribe();
    api.deletePermissionRow("user-groups", 5).subscribe();
    api.group(8).subscribe();
    api.groupActive(8, true).subscribe();
    api.createUser({ username: "ada" }).subscribe();
    api.deleteUser(8).subscribe();
    api.categoryByName("Phones").subscribe();
    api.categoryWithSubcategories(3).subscribe();
    api.icon(2).subscribe();
    api.brandLogo(2).subscribe();
    api.inventoryBySku(11).subscribe();
    api.inventoryByProduct(12, 2, 5).subscribe();
    api.deleteInventory(13).subscribe();
    api.searchInventory("phone", "A", "LOW_STOCK", 2, 5).subscribe();
    api.inventoryHistory(13, 1, 5).subscribe();
    api.attributes().subscribe();
    api.attribute(1).subscribe();
    api.attributeByName("Color").subscribe();
    api.deleteAttribute(1).subscribe();
    api.attributeValues(1).subscribe();
    api.attributeValue(9).subscribe();
    api.attributeValueByText(1, "Red").subscribe();
    api.saveAttributeValue(9, "Blue").subscribe();
    api.deleteAttributeValue(9).subscribe();
    api.promotions("ACTIVE", 1, 20).subscribe();
    api.promotion(4).subscribe();
    api.savePromotion({ name: "Spring" }).subscribe();
    api.savePromotion({ name: "Spring" }, 4).subscribe();
    api.archivePromotion(4).subscribe();
    api.promotionSkus(4).subscribe();
    api.assignPromotionSkus(4, [7]).subscribe();
    api.removePromotionSku(4, 7).subscribe();
    api.promotionTransition(4, "activate").subscribe();
    api.orderPages(2, 10).subscribe();
    api.refundHistory("R-1").subscribe();
    api.similarProducts("R-1", 1, 5).subscribe();
    api.returnHistory("RT-1").subscribe();
    api.paymentsByUser(7).subscribe();
    api.paymentDetail(7, 3).subscribe();
    api.paymentByTransaction("TX-1").subscribe();
    api.paymentHistory(7, 1, 10, "SUCCESS").subscribe();
    api.transactionByNumber("TX-1").subscribe();
    api.transactionStatusHistory(6).subscribe();
    api.staffSession().subscribe();
    api.monitor().subscribe();
    api.auditLogs("order", 1, 20, { actorId: "7" }).subscribe();
    const expectCall = (method: string, url: string, body?: unknown) => {
      const request = http.expectOne({ method, url });
      expect(request.request.method).toBe(method);
      if (body !== undefined) expect(request.request.body).toEqual(body);
      request.flush(method === "DELETE" ? null : one);
    };
    expectCall("POST", "/api/v1/functions/get/id/?id=4", {});
    expectCall("POST", "/api/v1/user-groups/delete/?id=5", {});
    expectCall("GET", "/api/v1/groups/get/8");
    expectCall("PATCH", "/api/v1/groups/activate/8?isActive=true", {});
    expectCall("POST", "/api/v1/user/create", { username: "ada" });
    expectCall("POST", "/api/v1/user/id/delete?id=8", {});
    expectCall("POST", "/api/v1/categories/name/?name=Phones", {});
    expectCall("POST", "/api/v1/categories/with-subcategories?id=3", {});
    expectCall("GET", "/api/v1/category-icons/id?id=2");
    expectCall("GET", "/api/v1/brand-logos/id?id=2");
    expectCall("POST", "/api/v1/inventory/sku/?skuId=11", {});
    expectCall(
      "POST",
      "/api/v1/inventory/product/?productId=12&page=1&size=5",
      {},
    );
    expectCall("POST", "/api/v1/inventory/delete?id=13", {});
    expectCall(
      "POST",
      "/api/v1/inventory/search?page=1&size=5&sort=id,desc&search=phone&warehouse=A&status=LOW_STOCK",
      {},
    );
    expectCall(
      "GET",
      "/api/v1/inventory/history/13?page=0&size=5&sort=createdAt,desc",
    );
    http.expectOne("/api/v1/attributes").flush([]);
    expectCall("GET", "/api/v1/attributes/1");
    expectCall("GET", "/api/v1/attributes/name/Color");
    expectCall("DELETE", "/api/v1/attributes/1");
    http.expectOne("/api/v1/attribute-values/attribute/1").flush([]);
    expectCall("GET", "/api/v1/attribute-values/9");
    expectCall("GET", "/api/v1/attribute-values?attributeId=1&value=Red");
    expectCall("PUT", "/api/v1/attribute-values/9", { id: 9, value: "Blue" });
    expectCall("DELETE", "/api/v1/attribute-values/9");
    http
      .expectOne("/api/v1/admin/promotions?page=1&size=20&status=ACTIVE")
      .flush(ok);
    expectCall("GET", "/api/v1/admin/promotions/4");
    expectCall("POST", "/api/v1/admin/promotions", { name: "Spring" });
    expectCall("PUT", "/api/v1/admin/promotions/4", { name: "Spring" });
    expectCall("DELETE", "/api/v1/admin/promotions/4");
    http.expectOne("/api/v1/admin/promotions/4/skus?page=1&size=20").flush(ok);
    expectCall("POST", "/api/v1/admin/promotions/4/skus", { skuIds: [7] });
    expectCall("DELETE", "/api/v1/admin/promotions/4/skus/7");
    expectCall("POST", "/api/v1/admin/promotions/4/activate", {});
    http
      .expectOne("/api/v1/orders?page=1&size=10&sort=orderDate,desc")
      .flush(ok);
    http
      .expectOne("/api/v1/refunds/R-1/history")
      .flush({ code: "200", data: [] });
    expectCall("GET", "/api/v1/refunds/R-1/similar-products?page=1&size=5");
    http
      .expectOne("/api/v1/returns/RT-1/history")
      .flush({ code: "200", data: [] });
    expectCall("POST", "/api/v1/payments/user/id?userId=7", {});
    expectCall("POST", "/api/v1/payments/user/detail?userId=7&paymentId=3", {});
    expectCall("POST", "/api/v1/payments/transaction/?transactionId=TX-1", {});
    http
      .expectOne(
        "/api/v1/payments/user/history?userId=7&page=0&size=10&sort=paymentDate,desc&status=SUCCESS",
      )
      .flush(ok);
    expectCall("GET", "/api/v1/payment-transactions/no/TX-1");
    http
      .expectOne("/api/v1/payment-transactions/6/status-history")
      .flush({ code: "200", data: [] });
    http
      .expectOne("/api/v1/admin/session")
      .flush({ success: true, data: { role: "ADMIN" } });
    http
      .expectOne("/api/v1/admin/monitor")
      .flush({ success: true, data: { services: [] } });
    const audit = http.expectOne(
      "/api/admin/audit-logs/order?page=1&size=20&sort=occurredAt&direction=DESC&actorId=7",
    );
    expect(audit.request.method).toBe("GET");
    audit.flush({
      success: true,
      data: {
        content: [{ id: 1 }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
      },
    });
  });
});
