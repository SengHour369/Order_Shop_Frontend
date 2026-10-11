import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { PageState } from "../../shared/page-state";
import { Icon } from "../../shared/icon";
import { Status } from "../../shared/status";
import {
  AdminApi,
  field,
  OrderSummary,
  Row,
  text,
  tone,
  usd,
  when,
} from "./admin.api";
const statuses = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
  "REFUNDED",
];
function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
@Component({
  imports: [Status, RouterLink, FormsModule, Icon],
  template: `<section>
    <div class="adm-page-head">
      <div>
        <h2>History Order Details</h2>
        <p>Orders returned by the order service.</p>
      </div>
      <div class="adm-head-actions">
        <button
          class="adm-btn adm-primary"
          type="button"
          [disabled]="!visible().length"
          (click)="exportRows()"
        >
          Export
        </button>
      </div>
    </div>
    <div class="adm-stats">
      <article class="adm-card stat">
        <span class="k">Total orders</span>
        <strong>{{ summary()?.totalOrders ?? "—" }}</strong>
        <span class="adm-ico grad-indigo"><app-icon name="list" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">Delivered</span>
        <strong>{{ summary()?.delivered ?? "—" }}</strong>
        <span class="adm-ico grad-green"><app-icon name="check" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">Pending</span>
        <strong>{{ summary()?.pending ?? "—" }}</strong>
        <span class="adm-ico grad-amber"><app-icon name="clock" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">Cancelled</span>
        <strong>{{ summary()?.cancelled ?? "—" }}</strong>
        <span class="adm-ico grad-red"><app-icon name="close" /></span>
      </article>
    </div>
    <app-status [busy]="busy()" [error]="error()" />
    <div class="adm-table-card">
      <form class="adm-filter" (ngSubmit)="$event.preventDefault()">
        <input
          name="search"
          [(ngModel)]="search"
          placeholder="Search by order ID or customer"
        />
        <select
          name="status"
          [ngModel]="status"
          (ngModelChange)="setStatus($event)"
        >
          <option value="">All Order Status</option>
          @for (item of statuses; track item) {
            <option [value]="item">{{ pretty(item) }}</option>
          }
        </select>
        <select name="payment" [(ngModel)]="paymentMethod">
          <option value="all">All Payment Methods</option>
          <optgroup label="KHQR network">
            <option value="BAKONG">Bakong</option>
            <option value="ABA">ABA</option>
            <option value="ACLEDA">ACLEDA</option>
          </optgroup>
          <optgroup label="Cards & other">
            <option value="RAZORPAY">Razorpay</option>
            <option value="SINGE">Singe</option>
          </optgroup>
        </select>
        <input
          name="date"
          type="date"
          [(ngModel)]="date"
          aria-label="Order date"
        />
        @if (filtersOn()) {
          <button class="adm-btn" type="button" (click)="clearFilters()">
            Clear
          </button>
        }
      </form>
      <div class="adm-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Payment method</th>
              <th>Payment status</th>
              <th>Order status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (order of visible(); track field(order, "id")) {
              <tr>
                <td>{{ text(field(order, "order_number", "orderNumber")) }}</td>
                <td>
                  <div class="adm-who">
                    <span class="adm-dot">{{
                      initial(customerName(order))
                    }}</span>
                    <span>
                      <b>{{ customerName(order) }}</b>
                      <small>{{
                        text(field(order, "customer_id", "customerId"))
                      }}</small>
                    </span>
                  </div>
                </td>
                <td>{{ text(productOf(order)) }}</td>
                <td>{{ text(quantityOf(order)) }}</td>
                <td>
                  {{
                    usd(field(order, "total_amount", "totalAmount", "total"))
                  }}
                </td>
                <td>{{ text(paymentMethodOf(order)) }}</td>
                <td>
                  <span
                    class="adm-badge"
                    [class.on]="
                      paymentStatusOf(order) !== '' &&
                      tone(paymentStatusOf(order)) === 'on'
                    "
                    [class.off]="
                      paymentStatusOf(order) !== '' &&
                      tone(paymentStatusOf(order)) === 'off'
                    "
                    [class.wait]="
                      paymentStatusOf(order) !== '' &&
                      tone(paymentStatusOf(order)) === 'wait'
                    "
                    >{{ text(paymentStatusOf(order)) }}</span
                  >
                </td>
                <td>
                  <span
                    class="adm-badge"
                    [class.on]="tone(field(order, 'status')) === 'on'"
                    [class.off]="tone(field(order, 'status')) === 'off'"
                    [class.wait]="tone(field(order, 'status')) === 'wait'"
                    >{{ text(field(order, "status")) }}</span
                  >
                </td>
                <td>
                  <a
                    class="adm-btn icon"
                    [routerLink]="['/admin/orders', field(order, 'id')]"
                    aria-label="View order"
                    ><app-icon name="eye"
                  /></a>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="9">No orders on this page.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="adm-pager">
        <span>
          Rows per page
          <select
            [ngModel]="size"
            (ngModelChange)="setSize($event)"
            name="size"
            aria-label="Rows per page"
          >
            @for (option of sizes; track option) {
              <option [ngValue]="option">{{ option }}</option>
            }
          </select>
          {{ range() }}
        </span>
        <span class="adm-pages">
          <button
            class="adm-btn"
            type="button"
            [disabled]="page <= 1 || busy()"
            (click)="goto(page - 1)"
          >
            Previous
          </button>
          @for (n of pageList(); track n) {
            <button
              class="adm-btn"
              type="button"
              [class.adm-primary]="n === page"
              [disabled]="busy()"
              (click)="goto(n)"
            >
              {{ n }}
            </button>
          }
          <button
            class="adm-btn"
            type="button"
            [disabled]="page >= pages() || busy()"
            (click)="goto(page + 1)"
          >
            Next
          </button>
        </span>
      </div>
    </div>
  </section>`,
})
export class OrdersPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  statuses = statuses;
  sizes = [10, 20, 50];
  rows = signal<Row[]>([]);
  summary = signal<OrderSummary | null>(null);
  total = signal(0);
  pages = signal(1);
  page = 1;
  size = 10;
  status = "";
  search = "";
  paymentMethod = "all";
  date = "";
  field = field;
  text = text;
  usd = usd;
  tone = tone;
  constructor() {
    super();
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get("q") || "";
      this.search = q;
      this.page = 1;
      this.load();
      if (q) this.lookup(q);
    });
  }
  private lookup(number: string) {
    this.api.orderByNumber(number).subscribe({
      next: (order) =>
        void this.router.navigate(["/admin/orders", field(order, "id")]),
      error: () => this.error.set("No order matched that number."),
    });
  }
  load() {
    this.run(
      forkJoin({
        list: this.api.orders(this.page, this.status, this.size),
        summary: this.api.ordersSummary(),
      }),
      (result) => {
        this.rows.set(result.list.items);
        this.total.set(result.list.total);
        this.pages.set(result.list.pages);
        this.summary.set(result.summary);
      },
    );
  }
  setStatus(status: string) {
    this.status = status;
    this.page = 1;
    this.load();
  }
  setSize(size: number) {
    this.size = Number(size);
    this.page = 1;
    this.load();
  }
  goto(page: number) {
    if (page < 1 || page > this.pages() || page === this.page || this.busy())
      return;
    this.page = page;
    this.load();
  }
  pageList() {
    const total = this.pages();
    const end = Math.min(total, Math.max(this.page, 1) + 2);
    const start = Math.max(1, end - 4);
    const list: number[] = [];
    for (let n = start; n <= Math.min(total, start + 4); n++) list.push(n);
    return list;
  }
  range() {
    if (!this.total()) return "0 orders";
    const from = (this.page - 1) * this.size + 1;
    const to = Math.min(this.page * this.size, this.total());
    return `${from}–${to} of ${this.total()}`;
  }
  filtersOn() {
    return (
      !!this.search.trim() ||
      !!this.status ||
      this.paymentMethod !== "all" ||
      !!this.date
    );
  }
  clearFilters() {
    const reload = !!this.status;
    this.search = "";
    this.paymentMethod = "all";
    this.date = "";
    this.status = "";
    this.page = 1;
    if (reload) this.load();
  }
  visible() {
    const q = this.search.trim().toLowerCase();
    const method = this.paymentMethod;
    const day = this.date;
    return this.rows().filter((row) => {
      if (q) {
        const number = String(
          field(row, "order_number", "orderNumber"),
        ).toLowerCase();
        const name = this.customerName(row).toLowerCase();
        if (!number.includes(q) && !name.includes(q)) return false;
      }
      if (method && method !== "all") {
        if (
          String(this.paymentMethodOf(row)).toUpperCase() !==
          method.toUpperCase()
        )
          return false;
      }
      if (day && !this.onDay(row, day)) return false;
      return true;
    });
  }
  customerName(row: Row) {
    const name = field(row, "customer_name", "customerName");
    if (name !== "") return String(name);
    const customer = row["customer"];
    if (typeof customer === "string" && customer.trim()) return customer;
    if (customer && typeof customer === "object") {
      const nested = field(customer as Row, "name", "username");
      if (nested !== "") return String(nested);
    }
    return "Guest";
  }
  initial(name: string) {
    const letter = name.trim().charAt(0);
    return letter ? letter.toUpperCase() : "?";
  }
  itemsOf(row: Row) {
    const raw = row["items"] ?? row["order_items"] ?? row["orderItems"];
    return Array.isArray(raw) ? (raw as Row[]) : [];
  }
  productOf(row: Row) {
    const first = this.itemsOf(row)[0];
    if (!first) return "";
    const name = field(
      first,
      "product_name",
      "productName",
      "name",
      "promotion_name",
      "promotionName",
    );
    if (name !== "") return name;
    return field(
      first,
      "product_sku_id",
      "productSkuId",
      "product_id",
      "productId",
    );
  }
  quantityOf(row: Row) {
    const first = this.itemsOf(row)[0];
    if (!first) return "";
    return field(first, "quantity", "qty");
  }
  paymentMethodOf(row: Row) {
    const direct = field(row, "payment_method", "paymentMethod");
    if (direct !== "") return direct;
    const payment = row["payment"];
    if (payment && typeof payment === "object")
      return field(payment as Row, "payment_method", "paymentMethod", "method");
    return "";
  }
  paymentStatusOf(row: Row) {
    const direct = field(row, "payment_status", "paymentStatus");
    if (direct !== "") return direct;
    const payment = row["payment"];
    if (payment && typeof payment === "object")
      return field(payment as Row, "status");
    return "";
  }
  onDay(row: Row, day: string) {
    const value = field(
      row,
      "order_date",
      "orderDate",
      "created_at",
      "createdAt",
      "date",
    );
    if (value === "") return false;
    const raw = String(value);
    if (raw.slice(0, 10) === day) return true;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return false;
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dateNum = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${dateNum}` === day;
  }
  pretty(value: unknown) {
    const raw = String(value ?? "");
    if (!raw || raw === "—") return "—";
    const clean = raw.toLowerCase().replace(/_/g, " ");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  exportRows() {
    const header = [
      "Order ID",
      "Customer",
      "Product",
      "Quantity",
      "Total",
      "Payment method",
      "Payment status",
      "Order status",
    ];
    const lines = this.visible().map((row) =>
      [
        text(field(row, "order_number", "orderNumber")),
        this.customerName(row),
        text(this.productOf(row)),
        text(this.quantityOf(row)),
        usd(field(row, "total_amount", "totalAmount", "total")),
        text(this.paymentMethodOf(row)),
        text(this.paymentStatusOf(row)),
        text(field(row, "status")),
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob(
      [[header.map(csvCell).join(","), ...lines].join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "orders.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
@Component({
  imports: [Status, RouterLink, FormsModule],
  template: `<section>
    <div class="adm-page-head">
      <div>
        <h2>Order Details</h2>
        <p><a routerLink="/admin/orders">Back to orders</a></p>
      </div>
    </div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (order(); as current) {
      <article class="adm-panel">
        <div class="adm-section-title">
          <div>
            <h3>
              Order {{ text(field(current, "order_number", "orderNumber")) }}
            </h3>
            <p>Placed {{ when(placed(current)) }}</p>
          </div>
          <span
            class="adm-badge"
            [class.on]="tone(field(current, 'status')) === 'on'"
            [class.off]="tone(field(current, 'status')) === 'off'"
            [class.wait]="tone(field(current, 'status')) === 'wait'"
            >{{ text(field(current, "status")) }}</span
          >
        </div>
      </article>
      <div class="adm-grid" style="margin-top:14px">
        <article class="adm-panel">
          <h3>Customer Details</h3>
          <div class="adm-who">
            <span class="adm-dot">{{ initial(customerName(current)) }}</span>
            <span>
              <b>{{ customerName(current) }}</b>
              @if (field(current, "customer_email", "customerEmail") !== "") {
                <small>{{
                  text(field(current, "customer_email", "customerEmail"))
                }}</small>
              }
            </span>
          </div>
          <p>Id {{ text(field(current, "customer_id", "customerId")) }}</p>
        </article>
        <article class="adm-panel">
          <h3>Order Summary</h3>
          <div class="adm-kv">
            <span>Order ID</span
            ><b>{{ text(field(current, "order_number", "orderNumber")) }}</b>
            <span>Order status</span><b>{{ text(field(current, "status")) }}</b>
            <span>Payment status</span
            ><b>{{ text(paymentStatusOf(current)) }}</b>
            <span>Payment method</span
            ><b>{{ text(paymentMethodOf(current)) }}</b>
          </div>
        </article>
        <article class="adm-panel">
          <h3>Pricing Summary</h3>
          <div class="adm-kv">
            <span>Total amount</span
            ><b>{{
              usd(field(current, "total_amount", "totalAmount", "total"))
            }}</b>
          </div>
        </article>
        <article class="adm-panel">
          <h3>Shipping Address</h3>
          <div class="adm-kv">
            <span>Address id</span
            ><b>{{
              text(field(current, "shipping_address_id", "shippingAddressId"))
            }}</b>
          </div>
        </article>
      </div>
      <div class="adm-work" style="margin-top:14px">
        <div class="adm-stack">
          <article class="adm-panel">
            <h3>Ordered Items ({{ items().length }})</h3>
            <div class="adm-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of items(); track field(item, "id")) {
                    <tr>
                      <td>
                        <b>{{ text(itemName(item)) }}</b>
                        <small
                          >SKU
                          {{
                            text(field(item, "product_sku_id", "productSkuId"))
                          }}</small
                        >
                      </td>
                      <td>{{ usd(field(item, "unit_price", "unitPrice")) }}</td>
                      <td>{{ text(field(item, "quantity")) }}</td>
                      <td>
                        {{ usd(field(item, "total_price", "totalPrice")) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4">No line items returned.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </article>
          <article class="adm-panel">
            <h3>Payment Information</h3>
            <div class="adm-kv">
              <span>Payment id</span
              ><b>{{ text(field(current, "payment_id", "paymentId")) }}</b>
              <span>Payment method</span
              ><b>{{ text(paymentMethodOf(current)) }}</b>
              <span>Payment status</span
              ><b>{{ text(paymentStatusOf(current)) }}</b>
              <span>Paid amount</span
              ><b>{{
                paidAmount(current) === "" ? "—" : usd(paidAmount(current))
              }}</b>
            </div>
          </article>
        </div>
        <article class="adm-panel">
          <h3>Order Timeline</h3>
          <div class="adm-kv">
            <span>Order placed</span><b>{{ when(placed(current)) }}</b>
            <span>Updated</span
            ><b>{{ when(field(current, "updated_at", "updatedAt")) }}</b>
            <span>Status</span><b>{{ text(field(current, "status")) }}</b>
          </div>
          <form class="adm-form" style="margin-top:14px" (ngSubmit)="save()">
            <label
              >Order status
              <select name="next" [(ngModel)]="next">
                @for (item of statuses; track item) {
                  <option [value]="item">{{ pretty(item) }}</option>
                }
              </select>
            </label>
            <button class="adm-btn adm-primary" [disabled]="busy()">
              Update status
            </button>
          </form>
        </article>
      </div>
    }
  </section>`,
})
export class OrderDetailPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  statuses = statuses;
  order = signal<Row | null>(null);
  items = signal<Row[]>([]);
  next = "PENDING";
  field = field;
  text = text;
  usd = usd;
  when = when;
  tone = tone;
  constructor() {
    super();
    this.route.paramMap.subscribe((params) =>
      this.load(Number(params.get("id"))),
    );
  }
  load(id: number) {
    this.run(
      forkJoin({ order: this.api.order(id), items: this.api.orderItems(id) }),
      (result) => {
        this.order.set(result.order);
        this.next = String(field(result.order, "status") || "PENDING");
        const raw = result.items;
        const list = Array.isArray(raw)
          ? raw
          : ((raw as Row)["payload"] ?? (raw as Row)["content"] ?? []);
        this.items.set(Array.isArray(list) ? (list as Row[]) : []);
      },
    );
  }
  save() {
    const id = Number(field(this.order() || {}, "id"));
    this.run(this.api.orderStatus(id, this.next), (order) => {
      this.order.set(order);
      this.message.set("Order status updated.");
    });
  }
  customerName(row: Row) {
    const name = field(row, "customer_name", "customerName");
    if (name !== "") return String(name);
    const customer = row["customer"];
    if (typeof customer === "string" && customer.trim()) return customer;
    if (customer && typeof customer === "object") {
      const nested = field(customer as Row, "name", "username");
      if (nested !== "") return String(nested);
    }
    return "Guest";
  }
  initial(name: string) {
    const letter = name.trim().charAt(0);
    return letter ? letter.toUpperCase() : "?";
  }
  itemName(item: Row) {
    const name = field(
      item,
      "product_name",
      "productName",
      "name",
      "promotion_name",
      "promotionName",
    );
    return name === "" ? "" : name;
  }
  paymentMethodOf(row: Row) {
    const direct = field(row, "payment_method", "paymentMethod");
    if (direct !== "") return direct;
    const payment = row["payment"];
    if (payment && typeof payment === "object")
      return field(payment as Row, "payment_method", "paymentMethod", "method");
    return "";
  }
  paymentStatusOf(row: Row) {
    const direct = field(row, "payment_status", "paymentStatus");
    if (direct !== "") return direct;
    const payment = row["payment"];
    if (payment && typeof payment === "object")
      return field(payment as Row, "status");
    return "";
  }
  paidAmount(row: Row) {
    const direct = field(row, "paid_amount", "paidAmount");
    if (direct !== "") return direct;
    const payment = row["payment"];
    if (payment && typeof payment === "object")
      return field(payment as Row, "amount", "paid_amount", "paidAmount");
    return "";
  }
  placed(row: Row) {
    return field(row, "order_date", "orderDate", "created_at", "createdAt");
  }
  pretty(value: unknown) {
    const raw = String(value ?? "");
    if (!raw || raw === "—") return "—";
    const clean = raw.toLowerCase().replace(/_/g, " ");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
}
