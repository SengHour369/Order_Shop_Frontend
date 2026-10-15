import { inject, Injectable } from "@angular/core";
import { map, Observable, expand, EMPTY, reduce } from "rxjs";
import { ApiClient } from "../../../core/api/api-client";
import { MonthlyReport, StoreSettings } from "../reports/report.models";
export interface OrderSummary {
  totalOrders: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  failed: number;
  refunded: number;
}
export interface InventorySummary {
  total_products: number;
  total_stock: number;
  low_stock: number;
  out_of_stock: number;
}
export interface PageResult<T> {
  items: T[];
  total: number;
  pages: number;
  page: number;
}
export type Row = Record<string, unknown>;
export function usd(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
export function when(value: unknown) {
  if (value == null || value === "") return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
export function tone(status: unknown) {
  const value = String(status ?? "").toUpperCase();
  if (
    [
      "ACT",
      "ACTIVE",
      "TRUE",
      "DELIVERED",
      "SUCCESS",
      "APPROVED",
      "COMPLETED",
      "IN_STOCK",
    ].includes(value)
  )
    return "on";
  if (
    [
      "BLK",
      "CANCELLED",
      "CANCELED",
      "FAILED",
      "REJECTED",
      "INACTIVE",
      "FALSE",
      "OUT_OF_STOCK",
    ].includes(value)
  )
    return "off";
  return "wait";
}
export function text(value: unknown) {
  if (value == null || value === "") return "—";
  return String(value);
}
export function field(row: object, ...keys: string[]) {
  const record = row as Row;
  for (const key of keys) {
    const value = record[key];
    if (value != null && value !== "") return value;
  }
  return "";
}
function asRecord(value: unknown): Row | null {
  return value !== null && typeof value === "object" ? (value as Row) : null;
}
export function unwrapItem<T>(item: unknown): T {
  const row = asRecord(item);
  if (row && (Number(row["code"]) >= 400 || row["success"] === false)) {
    throw new Error(String(row["message"] || "Request failed"));
  }
  if (row && row["data"] && typeof row["data"] === "object")
    return row["data"] as T;
  return item as T;
}
export function unwrapPage<T>(raw: unknown): PageResult<T> {
  let value = raw;
  const envelope = asRecord(value);
  if (envelope && "code" in envelope) value = envelope["data"];
  if (Array.isArray(value)) {
    const items = value.map((item) => unwrapItem<T>(item));
    return { items, total: items.length, pages: 1, page: 1 };
  }
  const page = asRecord(value);
  if (!page) return { items: [], total: 0, pages: 1, page: 1 };
  const nested = page["payload"] ?? page["content"] ?? page["data"];
  const list = Array.isArray(nested) ? nested : [];
  const items = list.map((item) => unwrapItem<T>(item));
  const total = Number(
    page["total_items"] ??
      page["totalItems"] ??
      page["totalElements"] ??
      items.length,
  );
  const pages = Math.max(
    1,
    Number(page["total_pages"] ?? page["totalPages"] ?? 1) || 1,
  );
  const current = Number(
    page["current_page"] ??
      page["currentPage"] ??
      (page["number"] != null ? Number(page["number"]) + 1 : 1),
  );
  return {
    items,
    total: Number.isFinite(total) ? total : items.length,
    pages,
    page: Number.isFinite(current) ? current : 1,
  };
}
@Injectable({ providedIn: "root" })
export class AdminApi {
  private api = inject(ApiClient);
  private checked<T>(source: Observable<unknown>, read: (raw: unknown) => T) {
    return source.pipe(
      map((raw) => {
        const envelope = asRecord(raw);
        if (
          envelope &&
          (Number(envelope["code"]) >= 400 || envelope["success"] === false)
        )
          throw new Error(String(envelope["message"] || "Request failed"));
        return read(raw);
      }),
    );
  }
  private page<T>(source: Observable<unknown>) {
    return this.checked(source, (raw) => unwrapPage<T>(raw));
  }
  private one<T>(source: Observable<unknown>) {
    return this.checked(source, (raw) => {
      const record = asRecord(raw);
      return unwrapItem<T>(record && "data" in record ? record["data"] : raw);
    });
  }
  private rowsOf(source: Observable<unknown>) {
    return this.checked(source, (raw) => {
      const record = asRecord(raw);
      const data = record && "data" in record ? record["data"] : raw;
      return Array.isArray(data)
        ? data.map((item) => unwrapItem<Row>(item))
        : [];
    });
  }
  private query(page: number, size: number, type: number, value: string) {
    return { page, size, criteria_type: type, criteria_value: value };
  }
  private all<T>(load: (page: number) => Observable<PageResult<T>>) {
    return load(1).pipe(
      expand((result) =>
        result.page < result.pages ? load(result.page + 1) : EMPTY,
      ),
      reduce((items, result) => [...items, ...result.items], [] as T[]),
    );
  }
  allBrands() {
    return this.all((page) => this.brands(page, "", 100));
  }
  allCategories() {
    return this.all((page) => this.categories(page, 100));
  }
  category(id: number) {
    return this.one<Row>(
      this.api.post("/api/v1/categories/id/get/", {}, { id }),
    );
  }
  brand(id: number) {
    return this.one<Row>(
      this.api.post(
        "/api/v1/subcategories/get/all",
        this.query(1, 1, 4, String(id)),
      ),
    );
  }
  inventoryItem(id: number) {
    return this.one<Row>(this.api.post("/api/v1/inventory/id/", {}, { id }));
  }
  weeklyOrders(weekOf: string) {
    return this.one<
      { year: number; month: number; day: number; count: number }[]
    >(this.api.get("/api/v1/orders/reports/weekly", { weekOf }));
  }
  ordersSummary() {
    return this.one<OrderSummary>(this.api.get("/api/v1/orders/summary"));
  }
  monthlyReport(kind: string, year: number) {
    const resource = kind === "payment" ? "payments" : "orders";
    return this.one<MonthlyReport[]>(
      this.api.get(`/api/v1/${resource}/reports/monthly`, { year }),
    );
  }
  settings() {
    return this.one<StoreSettings | null>(
      this.api.get("/api/v1/admin/settings"),
    );
  }
  saveSettings(settings: StoreSettings) {
    return this.one<StoreSettings>(
      this.api.put("/api/v1/admin/settings", settings),
    );
  }
  permissionRows(resource: string, page = 1, type = 0, value = "", size = 20) {
    return this.page<Row>(
      this.api.post(
        `/api/v1/${resource}/get/all`,
        this.query(page, size, type, value),
      ),
    );
  }
  createPermissionRow(
    resource: string,
    params: Record<string, string | number>,
  ) {
    return this.one<Row>(
      this.api.post(`/api/v1/${resource}/create/`, {}, params),
    );
  }
  permissionStatus(resource: string, id: number, active: boolean) {
    return this.one<Row>(
      this.api.post(
        `/api/v1/${resource}/update/`,
        {},
        { id, isActive: String(active) },
      ),
    );
  }
  inventorySummary() {
    return this.one<InventorySummary>(
      this.api.get("/api/v1/inventory/summary"),
    );
  }
  customerCount() {
    return this.api.post<number>("/api/v1/user/count", {});
  }
  orders(page = 1, status = "", size = 10) {
    return this.page<Row>(
      this.api.post(
        "/api/v1/orders/get/all",
        this.query(page, size, status ? 2 : 0, status),
      ),
    );
  }
  customerOrders(userId: number, page = 1, size = 10) {
    return this.page<Row>(this.api.post('/api/v1/orders/get/all', this.query(page, size, 1, String(userId))));
  }
  order(id: number) {
    return this.one<Row>(this.api.post("/api/v1/orders/id/", {}, { id }));
  }
  orderByNumber(orderNumber: string) {
    return this.one<Row>(
      this.api.post("/api/v1/orders/number/", {}, { orderNumber }),
    );
  }
  orderItems(orderId: number) {
    return this.one<unknown>(
      this.api.post("/api/v1/orders/items", {}, { orderId }),
    );
  }
  orderStatus(id: number, status: string) {
    return this.one<Row>(
      this.api.post("/api/v1/orders/status/", {}, { id, status }),
    );
  }
  returns(page = 1, status = "", size = 10, filters: Row = {}) {
    const dates = { ...filters };
    for (const key of ["from_date", "to_date"]) {
      const value = dates[key];
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
        dates[key] =
          value + (key === "from_date" ? "T00:00:00" : "T23:59:59.999");
    }
    return this.page<Row>(
      this.api.post("/api/v1/returns/returns", {
        page,
        size,
        ...(status ? { status } : {}),
        ...dates,
      }),
    );
  }
  returnSummary() {
    return this.one<Row>(this.api.get("/api/v1/returns/summary"));
  }
  returnDetail(id: string) {
    return this.one<Row>(
      this.api.get(`/api/v1/returns/${encodeURIComponent(id)}`),
    );
  }
  returnsForOrder(orderNumber: string) {
    return this.page<Row>(
      this.api.post("/api/v1/returns/returns", {
        page: 1,
        size: 10,
        order_no: orderNumber,
      }),
    );
  }
  returnAction(id: string, action: string, remark = "", passed?: boolean) {
    const body: Row = {};
    if (remark) body["remark"] = remark;
    if (passed !== undefined) body["passed"] = passed;
    return this.one<Row>(
      this.api.post(
        `/api/v1/returns/${encodeURIComponent(id)}/${action}`,
        body,
      ),
    );
  }
  refunds(
    page = 1,
    status = "",
    size = 10,
    criteriaType = 0,
    criteriaValue = "",
  ) {
    return this.page<Row>(
      this.api.post(
        "/api/v1/refunds/list",
        this.query(
          page,
          size,
          criteriaType || (status ? 4 : 0),
          criteriaValue || status,
        ),
      ),
    );
  }
  refundSummary() {
    return this.one<Row>(this.api.get("/api/v1/refunds/summary"));
  }
  refundDetail(id: string) {
    return this.one<Row>(
      this.api.get(`/api/v1/refunds/${encodeURIComponent(id)}`),
    );
  }
  refundAction(id: string, action: "process" | "cancel", remark = "") {
    return this.one<Row>(
      this.api.post(
        `/api/v1/refunds/${encodeURIComponent(id)}/${action}`,
        remark ? { remark } : {},
      ),
    );
  }
  payments(page = 1, status = "", userId = "", size = 10) {
    const user = userId.trim();
    return this.page<Row>(
      this.api.post(
        "/api/v1/payments/get/all",
        this.query(page, size, user ? 1 : status ? 3 : 0, user || status),
      ),
    );
  }
  paymentByOrder(orderId: number) {
    return this.one<Row>(
      this.api.post("/api/v1/payments/order/", {}, { orderId }),
    );
  }
  transactions(page = 1, status = "", customerId = "", size = 10) {
    const customer = customerId.trim();
    return this.page<Row>(
      this.api.post(
        "/api/v1/payment-transactions/get/all",
        this.query(
          page,
          size,
          customer ? 2 : status ? 3 : 0,
          customer || status,
        ),
      ),
    );
  }
  transaction(id: number) {
    return this.one<Row>(this.api.get(`/api/v1/payment-transactions/${id}`));
  }
  // The list API accepts one criterion. Read every page before combining
  // search, method, status and dates so counts and exports remain complete.
  allTransactions(customerId = "") {
    return this.all((page) => this.transactions(page, "", customerId, 100));
  }
  transactionStatus(
    id: number,
    newStatus: string,
    changedBy: string,
    reason: string,
  ) {
    return this.one<Row>(
      this.api.put(`/api/v1/payment-transactions/${id}/status`, {
        new_status: newStatus,
        changed_by: changedBy,
        reason,
      }),
    );
  }
  customers() {
    return this.page<Row>(this.api.post("/api/v1/user/All", {})).pipe(
      map((result) => ({
        ...result,
        items: result.items.map((row) => this.safeUser(row)),
      })),
    );
  }
  address(id: number) {
    return this.one<Row>(this.api.get('/api/v1/addresses/' + id));
  }
  customer(id: number) {
    return this.one<Row>(this.api.get("/api/v1/user/id/user", { id })).pipe(
      map((row) => this.safeUser(row)),
    );
  }
  private safeUser(row: Row) {
    const safe = { ...row };
    delete safe["password"];
    return safe;
  }
  customerStatus(id: number, status: string) {
    return this.one<Row>(this.api.post("/api/v1/user/id", {}, { id, status }));
  }
  allGroups() { return this.all<Row>(page => this.groups(page, 100)); }
  groups(page = 1, size = 10) {
    return this.page<Row>(
      this.api.get("/api/v1/groups/get/all", { page: page - 1, size }),
    );
  }
  saveGroup(body: Row, id?: number) {
    return id
      ? this.one<Row>(this.api.put(`/api/v1/groups/update/${id}`, body))
      : this.one<Row>(this.api.post("/api/v1/groups/create", body));
  }
  deleteGroup(id: number) {
    return this.one<Row>(this.api.delete(`/api/v1/groups/delete/${id}`));
  }
  products(page = 1, name = "", size = 10, status = "") {
    return this.page<Row>(
      this.api.post("/api/v1/products/get/all", {
        ...this.query(page, size, name ? 1 : 0, name),
        ...(status ? { is_active: status === "active" } : {}),
      }),
    );
  }
  product(id: number) {
    return this.one<Row>(
      this.api.post(
        "/api/v1/products/get/all",
        this.query(1, 1, 6, String(id)),
      ),
    );
  }
  createProduct(fields: Row, files: File[]) {
    const body = new FormData();
    for (const file of files) body.append("files", file);
    return this.one<Row>(
      this.api.post("/api/v1/products/create/", body, {
        name: String(fields["name"]),
        description: String(fields["description"] || ""),
        is_active: String(fields["is_active"]),
        sub_category_id: Number(fields["sub_category_id"]),
        skus: JSON.stringify(fields["skus"]),
      }),
    );
  }
  updateProduct(id: number, fields: Row, files: File[] = []) {
    if (!files.length)
      return this.one<Row>(
        this.api.put("/api/v1/products/update/", fields, { id }),
      );
    const body = new FormData();
    for (const file of files) body.append("files", file);
    return this.one<Row>(
      this.api.put("/api/v1/products/update/", body, {
        id,
        name: String(fields["name"]),
        description: String(fields["description"] || ""),
        is_active: String(fields["is_active"]),
        sub_category_id: Number(fields["sub_category_id"]),
        skus: JSON.stringify(fields["skus"]),
      }),
    );
  }
  productStatus(id: number, isActive: boolean) {
    return this.one<Row>(
      this.api.post(
        "/api/v1/products/update/status/",
        {},
        { id, isActive: String(isActive) },
      ),
    );
  }
  deleteProduct(id: number) {
    return this.one<Row>(this.api.post("/api/v1/products/delete/", {}, { id }));
  }
  categories(page = 1, size = 10) {
    return this.page<Row>(
      this.api.post(
        "/api/v1/categories/get/all",
        {},
        { page: page - 1, size, sort: "name,asc" },
      ),
    );
  }
  saveCategory(body: Row, id?: number) {
    return id
      ? this.one<Row>(
          this.api.put("/api/v1/categories/id/update", body, { id }),
        )
      : this.one<Row>(this.api.post("/api/v1/categories/create/", body));
  }
  deleteCategory(id: number) {
    return this.api.delete("/api/v1/categories/delete", { id });
  }
  brands(page = 1, name = "", size = 10) {
    return this.page<Row>(
      this.api.post(
        "/api/v1/subcategories/get/all",
        this.query(page, size, name ? 1 : 0, name),
      ),
    );
  }
  saveBrand(
    name: string,
    categoryId: number,
    description: string,
    id?: number,
    file?: File | null,
    logoId?: number,
  ) {
    const body = new FormData();
    if (file) body.append(id ? "file" : "image", file);
    const params: Record<string, string | number> = {
      name,
      categoryId,
      description,
    };
    if (id) params["id"] = id;
    if (!file && logoId) params["logoId"] = logoId;
    return this.one<Row>(
      id
        ? this.api.post("/api/v1/subcategories/update/", body, params)
        : this.api.post("/api/v1/subcategories/create/", body, params),
    );
  }
  deleteBrand(id: number) {
    return this.one<Row>(
      this.api.post("/api/v1/subcategories/delete/", {}, { id }),
    );
  }
  inventory(page = 1, size = 10) {
    return this.page<Row>(
      this.api.post(
        "/api/v1/inventory/all/",
        {},
        { page: page - 1, size, sort: "id,desc" },
      ),
    );
  }
  lowStock(page = 1, size = 10) {
    return this.page<Row>(
      this.api.post(
        "/api/v1/inventory/low-stock",
        {},
        { page: page - 1, size, threshold: 10 },
      ),
    );
  }
  createInventory(skuId: number, quantity: number, warehouse: string) {
    return this.one<Row>(
      this.api.post(
        "/api/v1/inventory",
        { quantity, warehouse_location: warehouse, lowStockThreshold: 5 },
        { skuId },
      ),
    );
  }
  adjustInventory(
    id: number,
    quantity: number,
    warehouse: string,
    lowStockThreshold = 5,
  ) {
    return this.one<Row>(
      this.api.post(
        "/api/v1/inventory/exact",
        { quantity, warehouse_location: warehouse, lowStockThreshold },
        { id },
      ),
    );
  }
  restock(id: number, quantity: number) {
    return this.one<Row>(
      this.api.patch("/api/v1/inventory/restock", { quantity }, { id }),
    );
  }
  allInventory() {
    return this.all<Row>((page) => this.inventory(page, 100));
  }
  createCustomer(body: Row) {
    return this.one<Row>(this.api.post("/api/v1/user/create", body));
  }
  allPermissionRows(resource: string, type = 0, value = "") {
    return this.all<Row>((page) =>
      this.permissionRows(resource, page, type, value, resource === "functions" ? 1000 : 20),
    );
  }
  updatePermissionGroup(
    id: number,
    groupName: string,
    display: string,
    isActive: boolean,
  ) {
    return this.one<Row>(
      this.api.post(
        "/api/v1/user-groups/update/",
        {},
        {
          id,
          groupName,
          display,
          isActive: String(isActive),
        },
      ),
    );
  }
  icons() {
    return this.page<Row>(this.api.get("/api/v1/category-icons/get/all"));
  }
  brandLogos() {
    return this.page<Row>(this.api.get("/api/v1/brand-logos/get/all"));
  }
  createReturn(body: Row) {
    return this.one<Row>(this.api.post("/api/v1/returns/user", body));
  }
  cancellations(
    page = 1,
    orderNo = "",
    customerName = "",
    cancelStatus = "",
    size = 10,
  ) {
    const body: Row = { page, size };
    if (orderNo.trim()) body["orderNo"] = orderNo.trim();
    if (customerName.trim()) body["customerName"] = customerName.trim();
    if (cancelStatus.trim()) body["cancelStatus"] = cancelStatus.trim();
    return this.page<Row>(this.api.post("/api/v1/cancelations/list", body));
  }
  cancellationSummary() {
    return this.one<Row>(this.api.get("/api/v1/cancelations/summary"));
  }
  cancellation(orderNo: string) {
    return this.one<Row>(
      this.api.get(`/api/v1/cancelations/${encodeURIComponent(orderNo)}`),
    );
  }
  bakongCheck(md5: string) {
    // Bakong's data is transaction detail, not the shop's response envelope.
    // Preserve responseCode/errorCode so a negative verification is never hidden.
    return this.api.post<Row>("/api/v1/bakong/check-transaction", { md5 });
  }
  bakongQr(qr: string, md5: string) {
    return this.api.http.post(
      this.api.url("/api/v1/bakong/get-qr-image"),
      { qr, md5 },
      {
        responseType: "blob",
        observe: "response",
      },
    );
  }
  permissionRow(resource: string, id: number) {
    return this.one<Row>(
      this.api.post(`/api/v1/${resource}/get/id/`, {}, { id }),
    );
  }
  deletePermissionRow(resource: string, id: number) {
    return this.one<Row>(
      this.api.post(`/api/v1/${resource}/delete/`, {}, { id }),
    );
  }
  group(id: number) {
    return this.one<Row>(this.api.get(`/api/v1/groups/get/${id}`));
  }
  groupActive(id: number, isActive: boolean) {
    return this.one<Row>(
      this.api.patch(
        `/api/v1/groups/activate/${id}`,
        {},
        { isActive: String(isActive) },
      ),
    );
  }
  createUser(body: Row) {
    return this.one<Row>(this.api.post("/api/v1/user/create", body));
  }
  deleteUser(id: number) {
    return this.one<Row>(this.api.post("/api/v1/user/id/delete", {}, { id }));
  }
  categoryByName(name: string) {
    return this.one<Row>(
      this.api.post("/api/v1/categories/name/", {}, { name }),
    );
  }
  categoryWithSubcategories(id: number) {
    return this.one<Row>(
      this.api.post("/api/v1/categories/with-subcategories", {}, { id }),
    );
  }
  uploadCategoryIcon(id: number, file: File) {
    const body = new FormData();
    body.append("file", file);
    return this.one<Row>(
      this.api.put("/api/v1/categories/id/icon", body, { id }),
    );
  }
  icon(id: number) {
    return this.one<Row>(this.api.get("/api/v1/category-icons/id", { id }));
  }
  uploadIcon(name: string, file: File) {
    const body = new FormData();
    body.append("file", file);
    return this.one<Row>(
      this.api.post("/api/v1/category-icons/upload", body, { name }),
    );
  }
  brandLogo(id: number) {
    return this.one<Row>(this.api.get("/api/v1/brand-logos/id", { id }));
  }
  uploadBrandLogo(name: string, file: File) {
    const body = new FormData();
    body.append("file", file);
    return this.one<Row>(
      this.api.post("/api/v1/brand-logos/upload", body, { name }),
    );
  }
  inventoryBySku(skuId: number) {
    return this.one<Row>(
      this.api.post("/api/v1/inventory/sku/", {}, { skuId }),
    );
  }
  inventoryByProduct(productId: number, page = 1, size = 10) {
    return this.page<Row>(
      this.api.post(
        "/api/v1/inventory/product/",
        {},
        { productId, page: page - 1, size },
      ),
    );
  }
  deleteInventory(id: number) {
    return this.api.post<void>("/api/v1/inventory/delete", {}, { id });
  }
  searchInventory(
    search = "",
    warehouse = "",
    status = "",
    page = 1,
    size = 10,
  ) {
    const params: Record<string, string | number> = {
      page: page - 1,
      size,
      sort: "id,desc",
    };
    if (search.trim()) params["search"] = search.trim();
    if (warehouse.trim()) params["warehouse"] = warehouse.trim();
    if (status.trim()) params["status"] = status.trim();
    return this.page<Row>(
      this.api.post("/api/v1/inventory/search", {}, params),
    );
  }
  inventoryHistory(id: number, page = 1, size = 10) {
    return this.page<Row>(
      this.api.get(`/api/v1/inventory/history/${id}`, {
        page: page - 1,
        size,
        sort: "createdAt,desc",
      }),
    );
  }
  attributes() {
    return this.checked(this.api.get("/api/v1/attributes"), (raw) =>
      Array.isArray(raw) ? raw.map((item) => unwrapItem<Row>(item)) : [],
    );
  }
  attribute(id: number) {
    return this.one<Row>(this.api.get(`/api/v1/attributes/${id}`));
  }
  attributeByName(name: string) {
    return this.one<Row>(
      this.api.get(`/api/v1/attributes/name/${encodeURIComponent(name)}`),
    );
  }
  deleteAttribute(id: number) {
    return this.api.delete<void>(`/api/v1/attributes/${id}`);
  }
  attributeValue(id: number) {
    return this.one<Row>(this.api.get(`/api/v1/attribute-values/${id}`));
  }
  attributeValues(attributeId: number) {
    return this.checked(
      this.api.get(`/api/v1/attribute-values/attribute/${attributeId}`),
      (raw) =>
        Array.isArray(raw) ? raw.map((item) => unwrapItem<Row>(item)) : [],
    );
  }
  attributeValueByText(attributeId: number, value: string) {
    return this.one<Row>(
      this.api.get("/api/v1/attribute-values", { attributeId, value }),
    );
  }
  saveAttributeValue(id: number, value: string) {
    return this.one<Row>(
      this.api.put(`/api/v1/attribute-values/${id}`, { id, value }),
    );
  }
  deleteAttributeValue(id: number) {
    return this.api.delete<void>(`/api/v1/attribute-values/${id}`);
  }
  promotions(status = "", page = 1, size = 20) {
    const params: Record<string, string | number> = { page, size };
    if (status) params["status"] = status;
    return this.page<Row>(this.api.get("/api/v1/admin/promotions", params));
  }
  promotion(id: number) {
    return this.one<Row>(this.api.get(`/api/v1/admin/promotions/${id}`));
  }
  savePromotion(body: Row, id?: number) {
    return id
      ? this.one<Row>(this.api.put(`/api/v1/admin/promotions/${id}`, body))
      : this.one<Row>(this.api.post("/api/v1/admin/promotions", body));
  }
  archivePromotion(id: number) {
    return this.one<Row>(this.api.delete(`/api/v1/admin/promotions/${id}`));
  }
  promotionSkus(id: number, page = 1, size = 20) {
    return this.page<number>(
      this.api.get(`/api/v1/admin/promotions/${id}/skus`, { page, size }),
    );
  }
  assignPromotionSkus(id: number, skuIds: number[]) {
    return this.one<Row>(
      this.api.post(`/api/v1/admin/promotions/${id}/skus`, { skuIds }),
    );
  }
  removePromotionSku(id: number, skuId: number) {
    return this.one<Row>(
      this.api.delete(`/api/v1/admin/promotions/${id}/skus/${skuId}`),
    );
  }
  promotionTransition(id: number, action: "schedule" | "activate" | "disable") {
    return this.one<Row>(
      this.api.post(`/api/v1/admin/promotions/${id}/${action}`, {}),
    );
  }
  allPromotionSkus(id: number) {
    return this.all((page) => this.promotionSkus(id, page, 100));
  }
  orderPages(page = 1, size = 10) {
    return this.page<Row>(
      this.api.get("/api/v1/orders", {
        page: page - 1,
        size,
        sort: "orderDate,desc",
      }),
    );
  }
  refundHistory(id: string) {
    return this.rowsOf(
      this.api.get(`/api/v1/refunds/${encodeURIComponent(id)}/history`),
    );
  }
  similarProducts(id: string, page = 1, size = 10) {
    return this.one<Row>(
      this.api.get(
        `/api/v1/refunds/${encodeURIComponent(id)}/similar-products`,
        { page, size },
      ),
    );
  }
  returnHistory(id: string) {
    return this.rowsOf(
      this.api.get(`/api/v1/returns/${encodeURIComponent(id)}/history`),
    );
  }
  paymentsByUser(userId: number) {
    return this.one<Row>(
      this.api.post("/api/v1/payments/user/id", {}, { userId }),
    );
  }
  paymentDetail(userId: number, paymentId: number) {
    return this.one<Row>(
      this.api.post("/api/v1/payments/user/detail", {}, { userId, paymentId }),
    );
  }
  paymentByTransaction(transactionId: string) {
    return this.one<Row>(
      this.api.post("/api/v1/payments/transaction/", {}, { transactionId }),
    );
  }
  paymentHistory(userId: number, page = 1, size = 10, status = "") {
    const params: Record<string, string | number> = {
      userId,
      page: page - 1,
      size,
      sort: "paymentDate,desc",
    };
    if (status) params["status"] = status;
    return this.page<Row>(
      this.api.post("/api/v1/payments/user/history", {}, params),
    );
  }
  transactionByNumber(transactionNo: string) {
    return this.one<Row>(
      this.api.get(
        `/api/v1/payment-transactions/no/${encodeURIComponent(transactionNo)}`,
      ),
    );
  }
  transactionStatusHistory(id: number) {
    return this.rowsOf(
      this.api.get(`/api/v1/payment-transactions/${id}/status-history`),
    );
  }
  staffSession() {
    return this.one<Row>(this.api.get("/api/v1/admin/session"));
  }
  monitor() {
    return this.one<Row>(this.api.get("/api/v1/admin/monitor"));
  }
  auditLogs(
    service:
      | "ai"
      | "notification"
      | "auth"
      | "catalog"
      | "order"
      | "payment"
      | "admin",
    page = 1,
    size = 20,
    filters: Record<string, string> = {},
  ) {
    return this.checked(
      this.api.get(`/api/admin/audit-logs/${service}`, {
        page,
        size,
        sort: "occurredAt",
        direction: "DESC",
        ...filters,
      }),
      (raw) => {
        const envelope = asRecord(raw);
        return unwrapPage<Row>(
          envelope && "data" in envelope ? envelope["data"] : raw,
        );
      },
    );
  }
}
