import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, forkJoin, of, switchMap, map } from "rxjs";
import { AuthService } from "../../../core/auth/auth.service";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text, tone, usd, when } from "../api/admin.api";

const statuses = ["PENDING", "SUCCESS", "COMPLETED", "PAID", "FAILED", "CANCELLED", "REFUNDED"];
const successStatuses = ["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID", "APPROVED"];
const pendingStatuses = ["PENDING", "PROCESSING"];
const failedStatuses = ["FAILED", "CANCELLED", "CANCELED", "REJECTED"];

export function transactionCustomer(row: Row) {
  const nested = field(row, "customer", "user");
  const customer: Row = nested && typeof nested === "object" ? nested as Row : {};
  return {
    name: text(field(row, "customer_name", "customerName", "full_name", "fullName", "username") ||
      field(customer, "full_name", "fullName", "name", "username") ||
      field(row, "customer_id", "customerId", "user_id", "userId")),
    email: String(field(row, "customer_email", "customerEmail", "email") || field(customer, "email")),
  };
}
export function transactionDate(row: Row) {
  const value = field(row, "createdAt", "created_at", "datetime", "payment_date", "paymentDate");
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
export function transactionCsv(rows: Row[]) {
  const cells = [
    ["Transaction ID", "Order ID", "Customer", "Email", "Date & Time", "Payment Method", "Status", "Amount"],
    ...rows.map(row => [
      field(row, "transaction_no", "transactionNo", "id"),
      field(row, "order_number", "orderNumber", "order_no", "order_id", "orderId"),
      transactionCustomer(row).name, transactionCustomer(row).email,
      field(row, "createdAt", "created_at", "datetime", "payment_date", "paymentDate"),
      field(row, "payment_method", "paymentMethod", "method"), field(row, "status"), field(row, "amount"),
    ]),
  ];
  return "\uFEFF" + cells.map(cols => cols.map(value => {
    let cell = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(cell)) cell = "'" + cell;
    return '"' + cell.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n");
}

@Component({
  imports: [TranslatePipe, Status, FormsModule, RouterLink, Icon],
  templateUrl: "./transactions-list.html",
  styleUrl: "./transactions-list.css",
})
export class TransactionsPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  statuses = statuses;
  rows = signal<Row[]>([]);
  filters = signal({ search: "", method: "", status: "", from: "", to: "" });
  page = signal(1);
  size = signal(10);
  sizes = [10, 20, 50];
  search = "";
  method = "";
  status = "";
  from = "";
  to = "";
  customerId = "";
  showDates = signal(false);
  field = field;
  text = text;
  usd = usd;
  customer = transactionCustomer;
  filtered = computed(() => {
    const filters = this.filters();
    const search = filters.search.toLowerCase();
    const start = filters.from ? new Date(filters.from + "T00:00:00").getTime() : null;
    const end = filters.to ? new Date(filters.to + "T23:59:59.999").getTime() : null;
    return this.rows().filter(row => {
      const customer = transactionCustomer(row);
      const haystack = [
        field(row, "transaction_no", "transactionNo", "id"),
        field(row, "order_number", "orderNumber", "order_no", "order_id", "orderId"),
        field(row, "customer_id", "customerId", "user_id", "userId"),
        customer.name, customer.email,
      ].join(" ").toLowerCase();
      const date = transactionDate(row)?.getTime();
      return (!search || haystack.includes(search)) &&
        (!filters.method || this.methodName(row) === filters.method) &&
        (!filters.status || String(field(row, "status")).toUpperCase() === filters.status) &&
        (start === null || (date !== undefined && date >= start)) &&
        (end === null || (date !== undefined && date <= end));
    });
  });
  total = computed(() => this.filtered().length);
  pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  visible = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()));
  methodOptions = computed(() => [...new Set(this.rows().map(row => this.methodName(row)).filter(Boolean))].sort());
  summary = computed(() => {
    const rows = this.filtered();
    const count = (values: string[]) => rows.filter(row => values.includes(String(field(row, "status")).toUpperCase())).length;
    return [
      { label: "Total Transactions", value: rows.length.toLocaleString(), icon: "wallet", color: "blue" },
      { label: "Successful Transactions", value: count(successStatuses).toLocaleString(), icon: "card", color: "green" },
      { label: "Pending Transactions", value: count(pendingStatuses).toLocaleString(), icon: "clock", color: "amber" },
      { label: "Failed Transactions", value: count(failedStatuses).toLocaleString(), icon: "close", color: "red" },
      { label: "Total Amount", value: usd(rows.reduce((sum, row) => {
        const amount = Number(field(row, "amount"));
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0)), icon: "wallet", color: "purple" },
    ];
  });
  constructor() {
    super();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.customerId = params.get("customer") || "";
      this.search = params.get("q") || "";
      this.apply();
      this.load();
    });
  }
  load() {
    this.rows.set([]);
    this.page.set(1);
    this.run(this.api.allTransactions(this.customerId), rows => this.rows.set(rows), true);
  }
  apply() {
    if (this.from && this.to && this.from > this.to) {
      this.error.set("Choose an end date on or after the start date.");
      return;
    }
    this.error.set("");
    this.filters.set({ search: this.search.trim(), method: this.method, status: this.status, from: this.from, to: this.to });
    this.page.set(1);
  }
  reset() {
    this.search = this.method = this.status = this.from = this.to = "";
    this.apply();
  }
  hasFilters() {
    return Object.values(this.filters()).some(Boolean);
  }
  methodName(row: Row) {
    return String(field(row, "payment_method", "paymentMethod", "method"));
  }
  methodBrand(row: Row) {
    const value = this.methodName(row).toLowerCase().replaceAll(/[^a-z]/g, "");
    if (value.includes("mastercard")) return "mastercard";
    if (value.includes("visa")) return "visa";
    if (value.includes("paypal")) return "paypal";
    if (value.includes("apple")) return "apple";
    if (value.includes("stripe")) return "stripe";
    return "other";
  }
  account(row: Row) {
    return String(field(row, "masked_account", "maskedAccount"));
  }
  mark(row: Row) {
    return transactionCustomer(row).name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  }
  date(row: Row) {
    return transactionDate(row)?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) || "—";
  }
  time(row: Row) {
    return transactionDate(row)?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) || "";
  }
  statusTone(row: Row) {
    const value = String(field(row, "status")).toUpperCase();
    return successStatuses.includes(value) ? "success" : failedStatuses.includes(value) ? "failed" : "pending";
  }
  statusLabel(row: Row) {
    const value = String(field(row, "status"));
    return value.toUpperCase() === "SUCCESS" ? "Successful" : value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "—";
  }
  range() {
    if (!this.total()) return "Showing 0 results";
    return `Showing ${(this.page() - 1) * this.size() + 1} to ${Math.min(this.page() * this.size(), this.total())} of ${this.total().toLocaleString()} results`;
  }
  pageList() {
    const start = Math.max(1, Math.min(this.page() - 1, this.pages() - 2));
    return Array.from({ length: Math.min(3, this.pages()) }, (_, index) => start + index);
  }
  goto(page: number) {
    if (page >= 1 && page <= this.pages()) this.page.set(page);
  }
  setSize(size: number) {
    this.size.set(Number(size));
    this.page.set(1);
  }
  exportRows() {
    if (this.busy() || !this.total()) return;
    const url = URL.createObjectURL(new Blob([transactionCsv(this.filtered())], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
}
@Component({
  imports: [TranslatePipe, Status, RouterLink, FormsModule, Icon],
  templateUrl: "./transaction-detail.html",
  styleUrl: "./transaction-detail.css",
})
export class TransactionDetailPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private destroyRefForHistory = inject(DestroyRef);
  statuses = statuses;
  row = signal<Row | null>(null);
  history = signal<Row[]>([]);
  order = signal<Row>({});
  customerRecord = signal<Row>({});
  address = signal<Row>({});
  showActions = signal(false);
  successStatuses = successStatuses;
  String = String;
  recordId = 0;
  historyUnavailable = signal(false);
  items = computed(() => {
    const value = field(this.order(), "items");
    return Array.isArray(value) ? value as Row[] : [];
  });
  customerId() { return field(this.row() || {}, "customer_id", "customerId"); }
  orderId() { return field(this.row() || {}, "order_id", "orderId"); }
  transactionNumber() { return field(this.row() || {}, "transaction_no", "transactionNo", "id"); }
  orderNumber() { return field(this.order(), "order_number", "orderNumber") || this.orderId(); }
  customerName() {
    return text(field(this.customerRecord(), "full_name", "fullName", "name", "username") || transactionCustomer(this.row() || {}).name);
  }
  initials() { return this.customerName().split(/\s+/).slice(0, 2).map(part => part[0]).join(""); }
  customerEmail() { return field(this.customerRecord(), "email") || field(this.row() || {}, "customer_email", "customerEmail"); }
  addressText() {
    const address = this.address();
    return [field(address, "address_line1", "address_line", "addressLine", "street", "address"), field(address, "city"), field(address, "state", "province"), field(address, "zip_code", "postal_code", "postalCode"), field(address, "country")].filter(Boolean).join(", ") || "—";
  }
  money(value: unknown) {
    if (value === "" || value === null || value === undefined) return "—";
    const currency = String(field(this.row() || {}, "currency") || "USD");
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value)); }
    catch { return `${value} ${currency}`; }
  }
  statusLabel() {
    const value = String(field(this.row() || {}, "status"));
    return successStatuses.includes(value.toUpperCase()) ? "Successful" : value ? value[0].toUpperCase() + value.slice(1).toLowerCase() : "—";
  }
  date() { return transactionDate(this.row() || {})?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) || "—"; }
  time() { return transactionDate(this.row() || {})?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) || ""; }
  subtotal() { return this.items().reduce((sum, item) => sum + Number(field(item, "total_price", "totalPrice") || 0), 0); }
  brand() { return String(field(this.row() || {}, "payment_method", "paymentMethod")).toLowerCase().includes("visa"); }
  async copy(value: unknown) {
    if (!value) return;
    try { await navigator.clipboard.writeText(String(value)); this.message.set("Copied to clipboard."); }
    catch { this.error.set("Could not copy. Select and copy the value manually."); }
  }
  downloadReceipt() {
    const lines = ["Transaction receipt", `Transaction: ${this.transactionNumber()}`, `Order: ${this.orderNumber()}`, `Customer: ${this.customerName()}`, `Amount: ${this.money(field(this.row() || {}, "amount"))}`, `Status: ${this.statusLabel()}`, ...this.items().map(item => `SKU ${field(item, "product_sku_id")}: ${field(item, "quantity")} × ${this.money(field(item, "unit_price"))}`)];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "transaction-receipt.txt"; link.click(); URL.revokeObjectURL(url);
  }
  next = "PENDING";
  reason = "";
  field = field;
  text = text;
  usd = usd;
  when = when;
  tone = tone;
  constructor() {
    super();
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) =>
      this.open(Number(params.get("id"))),
    );
  }
  open(id: number) {
    this.recordId = id;
    this.row.set(null); this.order.set({}); this.customerRecord.set({}); this.address.set({}); this.history.set([]); this.historyUnavailable.set(false);
    this.run(this.api.transaction(id).pipe(switchMap(row => {
      const orderId = Number(field(row, "order_id", "orderId"));
      const customerId = Number(field(row, "customer_id", "customerId"));
      return forkJoin({
        row: of(row),
        order: orderId ? this.api.order(orderId).pipe(catchError(() => of({} as Row))) : of({} as Row),
        customer: customerId ? this.api.customer(customerId).pipe(catchError(() => of({} as Row))) : of({} as Row),
        history: this.api.transactionStatusHistory(id).pipe(catchError(() => { this.historyUnavailable.set(true); return of([] as Row[]); })),
      });
    }), switchMap(result => {
      const addressId = Number(field(result.order, "shipping_address_id", "shippingAddressId"));
      return (addressId ? this.api.address(addressId).pipe(catchError(() => of({} as Row))) : of({} as Row)).pipe(map(address => ({ ...result, address })));
    })), result => {
      this.row.set(result.row); this.order.set(result.order); this.customerRecord.set(result.customer); this.address.set(result.address); this.history.set(result.history);
      this.next = String(field(result.row, "status") || "PENDING");
    }, true);
  }
  save() {
    if (!this.reason.trim()) { this.error.set("Enter a reason for this status change."); return; }
    const id = Number(field(this.row() || {}, "id"));
    this.run(
      this.api.transactionStatus(
        id,
        this.next,
        this.auth.session()?.username || "admin",
        this.reason.trim(),
      ),
      (row) => {
        this.row.set(row);
        this.message.set("Transaction status updated.");
        this.api.transactionStatusHistory(id).pipe(takeUntilDestroyed(this.destroyRefForHistory)).subscribe({
          next: (history) => { if (this.recordId === id) { this.history.set(history); this.historyUnavailable.set(false); } },
          error: () => undefined,
        });
      },
    );
  }
}
