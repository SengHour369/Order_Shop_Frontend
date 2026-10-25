import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { ProductImage } from "../../../shared/components/product-image";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin, switchMap, map, catchError, of } from "rxjs";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import {
  AdminApi,
  field,
  OrderSummary,
  Row,
  text,
  tone,
  usd,
  when,
} from "../api/admin.api";
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
  selector: "app-admin-orders",
  styleUrl: "./orders-list.css",
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, Status, RouterLink, FormsModule, Icon],
  template: `@if (accessDenied()) { <app-page-access-denied /> } @else { <section>
    <div class="adm-page-head">
      <div>
        <h2>{{ (embedded() ? "Orders" : "History Order Details") | translate }}</h2>
        <p>Orders returned by the order service.</p>
      </div>
      <div class="adm-head-actions">
        <button
          class="adm-btn adm-primary"
          type="button"
          [disabled]="!visible().length"
          (click)="exportRows()"
        >
          {{ "Export" | translate }}
        </button>
      </div>
    </div>
    @if(queryRecords() === null){<div class="adm-stats">
      <article class="adm-card stat">
        <span class="k">{{ "Total orders" | translate }}</span>
        <strong>{{ summary()?.totalOrders ?? "—" }}</strong>
        <span class="adm-ico grad-indigo"><app-icon name="list" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">{{ "Delivered" | translate }}</span>
        <strong>{{ summary()?.delivered ?? "—" }}</strong>
        <span class="adm-ico grad-green"><app-icon name="check" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">{{ "Pending" | translate }}</span>
        <strong>{{ summary()?.pending ?? "—" }}</strong>
        <span class="adm-ico grad-amber"><app-icon name="clock" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">{{ "Cancelled" | translate }}</span>
        <strong>{{ summary()?.cancelled ?? "—" }}</strong>
        <span class="adm-ico grad-red"><app-icon name="close" /></span>
      </article>
    </div>
    }
    <app-status [busy]="busy()" [error]="error()" />
    @if(queryRecords() !== null){<p class="query-notice" role="status">Server-filtered order results{{queryDate() ? ' for ' + queryDate() : ''}}. Up to 20 records returned; filters and pages apply to these results.</p>}
    <div class="adm-table-card">
      <form class="adm-filter" (ngSubmit)="applyFilters()">
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
        <label class="order-guest-toggle"><input type="checkbox" role="switch" name="guestsOnly" [(ngModel)]="guestsOnly" (ngModelChange)="page=1; load()" /><span>Guest orders only</span></label>
        <select name="payment" [(ngModel)]="paymentMethod" (ngModelChange)="applyFilters()">
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
          (ngModelChange)="applyFilters()"
          [attr.aria-label]='"Order date" | translate'
        />
        <button class="adm-btn" type="submit" [disabled]="busy()">Search</button>
        @if (filtersOn()) {
          <button class="adm-btn" type="button" (click)="clearFilters()" [disabled]="busy()">
            Clear
          </button>
        }
      </form>
      <div class="adm-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ "Order ID" | translate }}</th>
              <th>{{ "Customer" | translate }}</th>
              <th>{{ "Product" | translate }}</th>
              <th>{{ "Quantity" | translate }}</th>
              <th>{{ "Total" | translate }}</th>
              <th>{{ "Payment method" | translate }}</th>
              <th>{{ "Payment status" | translate }}</th>
              <th>{{ "Order status" | translate }}</th>
              <th>{{ "Action" | translate }}</th>
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
                  @if (embedded()) {
                    <button type="button" class="adm-btn" (click)="openOrder.emit(+text(field(order, 'id')))">View order</button>
                  } @else {
                  <a
                    class="adm-btn icon"
                    [routerLink]="['/admin/orders', field(order, 'id')]"
                    [attr.aria-label]='"View order" | translate'
                     *appCanRoute="['/admin/orders', field(order, 'id')]"><app-icon name="eye"
                  /></a>
                  }
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
            {{ "Previous" | translate }}
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
            {{ "Next" | translate }}
          </button>
        </span>
      </div>
    </div>
  </section> }`,
})
export class OrdersPage extends PageState {
  private embeddedDestroy = inject(DestroyRef);
  embedded = input(false);
  queryRecords = input<Row[] | null>(null);
  queryDate = input("");
  openOrder = output<number>();
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
  guestsOnly = false;
  status = "";
  search = "";
  paymentMethod = "all";
  date = "";
  field = field;
  text = text;
  usd = usd;
  tone = tone;
  ngOnInit() {
    if (this.embedded()) { this.load(); return; }
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.embeddedDestroy)).subscribe((params) => {
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
  private readonly filteredSource = signal<Row[]|null>(null);
  applyFilters(){this.page=1;this.load();}
  load() {
    const records=this.queryRecords();
    if(records !== null){
      const matching=this.filterRows(records).filter(row=>!this.status || String(field(row,'status'))===this.status);
      this.rows.set(matching.slice((this.page-1)*this.size,this.page*this.size));
      this.total.set(matching.length);this.pages.set(Math.max(1,Math.ceil(matching.length/this.size)));
      return;
    }
    if(this.search.trim()||this.paymentMethod!=='all'||this.date){
      this.run(forkJoin({list:this.api.allOrders(this.status,this.guestsOnly),summary:this.api.ordersSummary()}),result=>{this.filteredSource.set(result.list);const matching=this.filterRows(result.list);this.total.set(matching.length);this.pages.set(Math.max(1,Math.ceil(matching.length/this.size)));this.summary.set(result.summary);});
      return;
    }
    this.filteredSource.set(null);
    this.run(
      forkJoin({
        list: this.api.orders(this.page, this.status, this.size, this.guestsOnly),
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
      this.guestsOnly ||
      !!this.search.trim() ||
      !!this.status ||
      this.paymentMethod !== "all" ||
      !!this.date
    );
  }
  clearFilters() {
    this.guestsOnly = false;
    this.search = "";
    this.paymentMethod = "all";
    this.date = "";
    this.status = "";
    this.page = 1;
    this.load();
  }
  visible() {
    const source=this.filteredSource();
    const matching=this.filterRows(source??this.rows());
    return source===null?matching:matching.slice((this.page-1)*this.size,this.page*this.size);
  }
  private filterRows(rows:Row[]) {
    const q = this.search.trim().toLowerCase();
    const method = this.paymentMethod;
    const day = this.date;
    return rows.filter((row) => {
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
    if (field(row, "customerType", "customer_type") === "GUEST") return "Guest customer";
    const name = field(row, "customer_name", "customerName");
    if (name !== "") return String(name);
    const customer = row["customer"];
    if (typeof customer === "string" && customer.trim()) return customer;
    if (customer && typeof customer === "object") {
      const nested = field(customer as Row, "name", "username");
      if (nested !== "") return String(nested);
    }
    return "Unknown customer";
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
  selector: "app-admin-order-detail",
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, Status, RouterLink, Icon, FormsModule, ProductImage],
  templateUrl: "./order-detail.html",
  styleUrls: ["./order-detail.css", "../styles/detail-typography.css"],
})
export class OrderDetailPage extends PageState {
  embeddedOrderId = input<number | null>(null);
  editing = signal(false);
  guestDelivery(row:Row):Row {
    const value=field(row,'shippingAddressSnapshot','shipping_address_snapshot');
    try {const parsed=typeof value==='string'?JSON.parse(value):value;return parsed && typeof parsed==='object' && !Array.isArray(parsed)?parsed as Row:{};}catch{return {};}
  }
  customerField(row: Row, ...keys: string[]) {
    if(field(row,'customerType','customer_type')==='GUEST') return field(this.guestDelivery(row),...keys);
    const customer = row['customer'];
    return customer && typeof customer === 'object' ? field(customer as Row, ...keys) : field(row, ...keys);
  }
  addressField(row: Row, ...keys: string[]) {
    const address = field(row, 'shipping_address', 'shippingAddress');
    if (address && typeof address === 'object') return field(address as Row, ...keys);
    const snapshot = this.guestDelivery(row);
    const aliases:Record<string,string>={recipient_name:'fullName',phone_number:'phone',address_line1:'streetHouse',city:'province'};
    for(const key of keys) {const value=snapshot[aliases[key] || key];if(value)return value;}
    return '';
  }
  customerLocation(row: Row) { return [this.addressField(row, 'city', 'province'), this.addressField(row, 'country')].filter(Boolean).join(', ') || '—'; }
  mapUrl(row: Row) {
    const address = field(row, 'shipping_address', 'shippingAddress');
    return address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(this.shippingAddress(row)) : '';
  }
  optionalMoney(value: unknown) { return value === '' || value == null ? '—' : usd(value); }
  subtotal() { return this.items().reduce((sum, item) => sum + Number(field(item, 'baseUnitPrice', 'unit_price', 'unitPrice') || 0) * Number(field(item, 'quantity', 'qty') || 0), 0); }
  discount() { return this.items().reduce((sum, item) => sum + Number(field(item, 'discountAmount', 'discount_amount') || 0) * Number(field(item, 'quantity', 'qty') || 0), 0); }
  optionalDiscount(item: Row) { const value = field(item, 'discountAmount', 'discount_amount'); return value === '' ? '—' : '-' + usd(Number(value) * Number(field(item, 'quantity', 'qty') || 0)); }
  isVisa(row: Row) { return String(this.paymentMethodOf(row)).toLowerCase().includes('visa'); }
  seller(row: Row): Row | null { const value = field(row, 'seller', 'store'); return value && typeof value === 'object' ? value as Row : null; }
  async copy(value: unknown) {
    if (!value) return;
    try { await navigator.clipboard.writeText(String(value)); this.message.set('Copied to clipboard.'); }
    catch { this.error.set('Could not copy. Select and copy the value manually.'); }
  }
  timeline(row: Row) {
    const events = [{ label: 'Order Placed', at: this.placed(row), shipping: false, failed: false }];
    const paidAt = this.paymentField(row, 'payment_date', 'paymentDate', 'paid_at');
    if (paidAt && ['SUCCESS', 'PAID', 'COMPLETED', 'APPROVED'].includes(String(this.paymentStatusOf(row)).toUpperCase())) events.push({ label: 'Payment Successful', at: paidAt, shipping: false, failed: false });
    const history = field(row, 'status_history', 'statusHistory');
    if (Array.isArray(history) && history.length) {
      for (const event of history as Row[]) {
        const status = field(event, 'new_status', 'newStatus', 'status');
        events.push({ label: this.pretty(status), at: field(event, 'changed_at', 'changedAt', 'created_at'), shipping: String(status).toUpperCase().includes('SHIP'), failed: ['FAILED', 'CANCELLED', 'REFUNDED'].includes(String(status).toUpperCase()) });
      }
    } else if (field(row, 'status') && String(field(row, 'status')).toUpperCase() !== 'PENDING') {
      events.push({ label: this.pretty(field(row, 'status')), at: field(row, 'updated_at', 'updatedAt'), shipping: String(field(row, 'status')).toUpperCase().includes('SHIP'), failed: ['FAILED', 'CANCELLED', 'REFUNDED'].includes(String(field(row, 'status')).toUpperCase()) });
    }
    return events;
  }
  printInvoice() { window.print(); }
  downloadInvoice() {
    const order = this.order();
    if (!order) return;
    // Use text nodes to escape all service-supplied fields in the downloadable invoice.
    const escape = (value: unknown) => { const node = document.createElement('span'); node.textContent = text(value); return node.innerHTML; };
    const number = field(order, 'order_number', 'orderNumber', 'id');
    const rows = this.items().map(item => '<tr><td>' + escape(this.itemName(item)) + '</td><td>' + escape(field(item, 'quantity', 'qty')) + '</td><td>' + escape(usd(field(item, 'total_price', 'totalPrice'))) + '</td></tr>').join('');
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>Order Invoice</title></head><body><h1>E-Shop Order Invoice</h1><p>Order ' + escape(number) + '</p><p>' + escape(this.customerName(order)) + '</p><p>' + escape(when(this.placed(order))) + '</p><table><thead><tr><th>Product</th><th>Quantity</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody></table><p>Total: ' + escape(usd(field(order, 'total_amount', 'totalAmount', 'total'))) + '</p><p>Payment status: ' + escape(this.paymentStatusOf(order)) + '</p></body></html>';
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'order-invoice.html'; a.click(); URL.revokeObjectURL(url);
  }
  shippingAddress(row: Row) {
    if(field(row,'customerType','customer_type')==='GUEST') {
      const delivery=this.guestDelivery(row);return ['streetHouse','village','commune','district','province'].map(key=>delivery[key]).filter(Boolean).join(', ') || 'Guest delivery details were redacted under the retention policy';
    }
    const address = field(row, 'shipping_address', 'shippingAddress');
    if (typeof address === 'string' && address) return address;
    if (address && typeof address === 'object') {
      const a = address as Row;
      return [field(a, 'address_line1', 'streetAddress', 'street_address'), field(a, 'commune', 'sangkat'), field(a, 'district', 'khan'), field(a, 'city', 'province'), field(a, 'country'), field(a, 'zip_code', 'postalCode')].filter(Boolean).join(', ') || 'No shipping address provided';
    }
    const id = field(row, 'shipping_address_id', 'shippingAddressId');
    return id === '' ? 'No shipping address provided' : 'Address ID: ' + id;
  }
  paymentField(row: Row, ...keys: string[]) {
    const payment = row['payment'];
    if (payment && typeof payment === 'object') return field(payment as Row, ...keys);
    // Order id is not a payment id.
    return field(row, ...keys.filter(key => key !== 'id'));
  }

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
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get("id"));
      if (id > 0 && !this.embeddedOrderId()) this.load(id);
    });
    effect(() => { const id = this.embeddedOrderId(); if (id && id > 0) untracked(() => this.load(id)); });
  }
  load(id: number) {
    this.order.set(null);
    this.items.set([]);
    const failures: string[] = [];
    this.run(
      forkJoin({ order: this.api.order(id), items: this.api.orderItems(id) }).pipe(
        switchMap(result => {
          const customerId = Number(field(result.order, 'customer_id', 'customerId'));
          const addressId = Number(field(result.order, 'shipping_address_id', 'shippingAddressId'));
          const paymentKnown = 'payment_id' in result.order || 'paymentId' in result.order;
          const hasPayment = !paymentKnown || Number(field(result.order,'payment_id','paymentId')) > 0;
          const optional = (source: ReturnType<AdminApi['customer']>, label: string) => source.pipe(catchError(() => { failures.push(label); return of(null); }));
          return forkJoin({
            customer: customerId ? optional(this.api.customer(customerId), 'customer') : of(null),
            address: addressId ? optional(this.api.address(addressId), 'shipping address') : of(null),
            payment: hasPayment ? optional(this.api.paymentByOrder(id), 'payment') : of(null),
          }).pipe(map(details => ({ ...result, details })));
        })
      ),
      result => {
        const customer = result.details.customer;
        this.order.set({ ...result.order,
          ...(customer ? { customer, customer_name: field(customer, 'fullName', 'full_name', 'name', 'username'), customer_email: field(customer, 'email') } : {}),
          ...(result.details.address ? { shipping_address: result.details.address } : {}),
          ...(result.details.payment ? { payment: result.details.payment } : {}),
        });
        this.next = String(field(result.order, 'status') || 'PENDING');
        const raw = result.items;
        const list = Array.isArray(raw) ? raw : ((raw as Row)['payload'] ?? (raw as Row)['content'] ?? []);
        this.items.set(Array.isArray(list) ? list as Row[] : []);
        if (failures.length) this.message.set('Some details could not be loaded: ' + failures.join(', ') + '.');
      }, true,
    );
  }
  save() {
    if (this.embeddedOrderId()) return;
    const id = Number(field(this.order() || {}, "id"));
    this.run(this.api.orderStatus(id, this.next), (order) => {
      this.order.update(current => ({ ...current, ...order }));
      this.editing.set(false);
      this.message.set("Order status updated.");
    });
  }
  customerName(row: Row) {
    if (field(row, "customerType", "customer_type") === "GUEST") return "Guest customer";
    const name = field(row, "customer_name", "customerName");
    if (name !== "") return String(name);
    const customer = row["customer"];
    if (typeof customer === "string" && customer.trim()) return customer;
    if (customer && typeof customer === "object") {
      const nested = field(customer as Row, "name", "username");
      if (nested !== "") return String(nested);
    }
    return "Unknown customer";
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
      {
      const explicit = field(payment as Row, 'paid_amount', 'paidAmount');
      if (explicit !== '') return explicit;
      return ['SUCCESS', 'PAID', 'COMPLETED', 'APPROVED'].includes(String(field(payment as Row, 'status')).toUpperCase()) ? field(payment as Row, 'amount') : '';
    }
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
