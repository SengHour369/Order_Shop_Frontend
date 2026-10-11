import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, forkJoin, map, of, switchMap } from "rxjs";
import { PageState } from "../../shared/page-state";
import { Icon } from "../../shared/icon";
import { Status } from "../../shared/status";
import { AdminApi, field, Row, text, usd, when } from "./admin.api";

const safe = <T>(source: import("rxjs").Observable<T>, fallback: T) =>
  source.pipe(catchError(() => of(fallback)));
const record = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
const rowsOf = (value: unknown): Row[] =>
  Array.isArray(value) ? (value as Row[]) : rowsOfValue(record(value));
const rowsOfValue = (value: Row): Row[] => {
  const rows = value["payload"] ?? value["content"] ?? value["items"];
  return Array.isArray(rows) ? (rows as Row[]) : [];
};
export function refundStatus(row: Row): string {
  return String(field(row, "status")).toUpperCase();
}
export function refundTone(row: Row): string {
  const status = refundStatus(row);
  if (["PROCESSED", "COMPLETED", "SUCCESS", "APPROVED"].includes(status))
    return "complete";
  if (["FAILED", "REJECTED", "CANCELLED"].includes(status)) return "failed";
  return "pending";
}
export function refundStage(row: Row): number {
  const status = refundStatus(row);
  if (["PROCESSED", "COMPLETED", "SUCCESS"].includes(status)) return 4;
  if (status === "PROCESSING") return 3;
  if (status === "APPROVED") return 2;
  if (["UNDER_REVIEW", "REVIEWING"].includes(status)) return 1;
  return 0;
}
export function related(api: AdminApi, refund: Row, loadReturn = false) {
  const number = String(field(refund, "order_no", "orderNo"));
  return (
    number ? safe(api.orderByNumber(number), {} as Row) : of({} as Row)
  ).pipe(
    switchMap((order) => {
      const customerId = Number(
        field(refund, "customer_id", "customerId") ||
          field(order, "userId", "user_id", "customer_id", "customerId"),
      );
      const paymentId = Number(
        field(refund, "payment_transaction_id", "paymentTransactionId"),
      );
      const orderId = Number(field(order, "id", "orderId"));
      return forkJoin({
        order: of(order),
        returnInfo:
          loadReturn && number
            ? safe(
                api.returnsForOrder(number).pipe(
                  switchMap((result) => {
                    const match =
                      result.items.find(
                        (item) =>
                          String(
                            field(item, "return_type", "returnType"),
                          ).toUpperCase() === "REFUND",
                      ) || result.items[0];
                    const id = match
                      ? String(field(match, "return_id", "returnId"))
                      : "";
                    return id ? api.returnDetail(id) : of({} as Row);
                  }),
                ),
                {} as Row,
              )
            : of({} as Row),
        customer: customerId
          ? safe(api.customer(customerId), {} as Row)
          : of({} as Row),
        payment: paymentId
          ? safe(api.transaction(paymentId), {} as Row)
          : orderId
            ? safe(api.paymentByOrder(orderId), {} as Row)
            : of({} as Row),
        products: orderId
          ? safe(
              api.orderItems(orderId).pipe(
                map(rowsOf),
                switchMap((items) =>
                  items.length
                    ? forkJoin(
                        items.map((item) => {
                          const skuId = Number(
                            field(item, "product_sku_id", "productSkuId"),
                          );
                          if (!skuId) return of(item);
                          return safe(
                            api.inventoryBySku(skuId),
                            {} as Row,
                          ).pipe(
                            switchMap((inventory) => {
                              const productId = Number(
                                field(inventory, "product_id", "productId"),
                              );
                              return (
                                productId
                                  ? safe(api.product(productId), {} as Row)
                                  : of({} as Row)
                              ).pipe(
                                map((product) => {
                                  const images = product["main_image"];
                                  return {
                                    ...inventory,
                                    ...item,
                                    product_name:
                                      field(
                                        inventory,
                                        "product_name",
                                        "productName",
                                      ) || field(product, "name"),
                                    image_url: Array.isArray(images)
                                      ? images[0]
                                      : "",
                                    sku: field(inventory, "sku"),
                                  };
                                }),
                              );
                            }),
                          );
                        }),
                      )
                    : of([] as Row[]),
                ),
              ),
              [] as Row[],
            )
          : of([] as Row[]),
      });
    }),
  );
}

@Component({
  imports: [Status, RouterLink, FormsModule, Icon],
  templateUrl: "./refunds-list.html",
  styleUrl: "./refunds.css",
})
export class RefundsPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  rows = signal<Row[]>([]);
  summary = signal<Row>({});
  total = signal(0);
  pages = signal(1);
  page = 1;
  size = 10;
  query = "";
  status = "";
  method = "";
  from = "";
  to = "";
  filtersOpen = false;
  sortAscending = false;
  field = field;
  text = text;
  usd = usd;
  when = when;
  tone = refundTone;
  constructor() {
    super();
    this.route.queryParamMap.subscribe((params) => {
      this.query = params.get("q") || "";
      this.page = 1;
      this.load();
    });
  }
  load() {
    let type = this.status ? 4 : 0;
    let value = this.status;
    if (this.query.trim()) {
      type = /^ord/i.test(this.query.trim())
        ? 2
        : /^r(?:ef|fd)/i.test(this.query.trim())
          ? 1
          : 3;
      value = this.query.trim();
    } else if (this.from && this.to) {
      type = 5;
      value = `${this.from}T00:00:00,${this.to}T23:59:59`;
    }
    this.run(
      forkJoin({
        list: this.api.refunds(this.page, "", this.size, type, value),
        summary: safe(this.api.refundSummary(), {} as Row),
      }).pipe(
        switchMap((result) => {
          const list = result.list.items;
          const enriched: import("rxjs").Observable<Row[]> = list.length
            ? forkJoin(
                list.map((row) =>
                  safe(
                    this.api.refundDetail(
                      String(field(row, "refund_id", "id")),
                    ),
                    row,
                  ).pipe(
                    switchMap((detail) =>
                      related(this.api, detail).pipe(
                        map((info) => ({ ...row, ...detail, ...info }) as Row),
                      ),
                    ),
                  ),
                ),
              )
            : of([] as Row[]);
          return enriched.pipe(map((rows) => ({ ...result, rows })));
        }),
      ),
      (result) => {
        this.rows.set(result.rows);
        this.summary.set(result.summary);
        this.total.set(result.list.total);
        this.pages.set(result.list.pages);
      },
    );
  }
  apply() {
    this.page = 1;
    this.load();
  }
  visibleRows() {
    const customerQuery =
      this.query.trim() && !/^(ord|ref|rfd)/i.test(this.query.trim())
        ? this.query.trim().toLowerCase()
        : "";
    return this.rows()
      .filter(
        (row) =>
          (!customerQuery ||
            `${this.customerName(row)} ${field(this.customer(row), "email")}`
              .toLowerCase()
              .includes(customerQuery)) &&
          (!this.status || refundStatus(row) === this.status) &&
          (!this.method ||
            this.paymentMethod(row)
              .toLowerCase()
              .includes(this.method.toLowerCase())),
      )
      .sort(
        (a, b) =>
          String(field(a, "refund_id")).localeCompare(
            String(field(b, "refund_id")),
          ) * (this.sortAscending ? 1 : -1),
      );
  }
  customer(row: Row) {
    return record(row["customer"]);
  }
  payment(row: Row) {
    return record(row["payment"]);
  }
  customerName(row: Row) {
    return text(
      field(this.customer(row), "fullName", "full_name", "username") ||
        field(row, "customer_name", "customerName"),
    );
  }
  paymentMethod(row: Row) {
    return text(
      field(this.payment(row), "paymentMethod", "payment_method", "method") ||
        field(row, "payment_method", "paymentMethod"),
    );
  }
  statistic(key: string) {
    return text(field(this.summary(), key));
  }
  failedCount() {
    return this.rows().filter((row) => refundTone(row) === "failed").length;
  }
  pageList() {
    const end = Math.min(this.pages(), this.page + 2);
    return Array.from(
      { length: end - Math.max(1, end - 4) + 1 },
      (_, i) => Math.max(1, end - 4) + i,
    );
  }
  goto(page: number) {
    if (this.busy() || page < 1 || page > this.pages() || page === this.page)
      return;
    this.page = page;
    this.load();
  }
  range() {
    const start = this.total() ? (this.page - 1) * this.size + 1 : 0;
    return `Showing ${start} to ${start ? start + this.rows().length - 1 : 0} of ${this.total()} entries`;
  }
}

@Component({
  imports: [Status, RouterLink, FormsModule, Icon],
  templateUrl: "./refund-detail.html",
  styleUrl: "./refunds.css",
})
export class RefundDetailPage extends PageState {
  api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  row = signal<Row | null>(null);
  history = signal<Row[]>([]);
  order = signal<Row>({});
  customer = signal<Row>({});
  payment = signal<Row>({});
  products = signal<Row[]>([]);
  returnInfo = signal<Row>({});
  id = "";
  remark = "";
  tab = "Overview";
  moreOpen = false;
  action: "process" | "cancel" | null = null;
  tabs = [
    "Overview",
    "Products",
    "Customer",
    "Order & Payment",
    "Shipping & Return",
    "Refund Process",
    "Notes",
    "Documents",
    "Activity Log",
  ];
  steps = ["Requested", "Under Review", "Approved", "Processing", "Completed"];
  field = field;
  text = text;
  usd = usd;
  when = when;
  tone = refundTone;
  stage = refundStage;
  constructor() {
    super();
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get("tab");
      if (tab && this.tabs.includes(tab)) this.tab = tab;
    });
    this.route.paramMap.subscribe((params) => {
      this.id = params.get("id") || "";
      this.load();
    });
  }
  load(done = "") {
    this.run(
      forkJoin({
        row: this.api.refundDetail(this.id),
        history: safe(this.api.refundHistory(this.id), [] as Row[]),
      }).pipe(
        switchMap((result) =>
          related(this.api, result.row, true).pipe(
            map((info) => ({ ...result, ...info })),
          ),
        ),
      ),
      (result) => {
        this.row.set(result.row);
        this.history.set(result.history);
        this.order.set(result.order);
        this.customer.set(result.customer);
        this.payment.set(result.payment);
        this.products.set(result.products);
        this.returnInfo.set(result.returnInfo);
        if (done) this.message.set(done);
      },
    );
  }
  show(...tabs: string[]) {
    return this.tab === "Overview" || tabs.includes(this.tab);
  }
  customerName() {
    return text(
      field(this.customer(), "fullName", "full_name", "username") ||
        field(this.row() || {}, "customer_name", "customerName", "customer_id"),
    );
  }
  paymentMethod() {
    return text(
      field(this.payment(), "paymentMethod", "payment_method", "method"),
    );
  }
  canAct() {
    return (
      !!this.row() && refundStatus(this.row()!) === "PENDING" && !this.busy()
    );
  }
  stepDate(index: number) {
    if (index === 0)
      return field(this.row() || {}, "requested_at", "requestedAt");
    const states = [
      ["PENDING", "REQUESTED"],
      ["UNDER_REVIEW", "REVIEWING"],
      ["APPROVED"],
      ["PROCESSING"],
      ["PROCESSED", "COMPLETED", "SUCCESS"],
    ][index];
    const item = this.history().find((row) =>
      states.includes(
        String(field(row, "new_status", "newStatus")).toUpperCase(),
      ),
    );
    return item
      ? field(item, "changed_at", "changedAt")
      : index === 4
        ? field(this.row() || {}, "processed_at", "processedAt")
        : "";
  }
  productName(item: Row) {
    return text(
      field(item, "product_name", "productName", "name", "description"),
    );
  }
  productImage(item: Row) {
    return String(
      field(item, "image_url", "imageUrl", "image", "product_image"),
    );
  }
  submit() {
    if (!this.action || !this.canAct()) return;
    const action = this.action;
    this.run(
      this.api.refundAction(this.id, action, this.remark.trim()),
      (row) => {
        this.row.set(row);
        this.action = null;
        this.load(
          action === "process" ? "Refund processed." : "Refund cancelled.",
        );
      },
    );
  }
  print() {
    window.print();
  }
  download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            refund: this.row(),
            order: this.order(),
            payment: this.payment(),
            products: this.products(),
            history: this.history(),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${this.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.moreOpen = false;
  }
}
