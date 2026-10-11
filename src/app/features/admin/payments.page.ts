import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PageState } from "../../shared/page-state";
import { Icon } from "../../shared/icon";
import { Status } from "../../shared/status";
import { AdminApi, field, Row, text, tone, usd, when } from "./admin.api";
const successStatuses = ["COMPLETED", "SUCCESS", "PAID", "APPROVED"];
const pendingStatuses = ["PENDING", "PROCESSING"];
const failedStatuses = ["FAILED", "CANCELLED", "CANCELED", "REJECTED"];
@Component({
  imports: [Status, FormsModule, RouterLink, Icon],
  template: `<section class="adm-stack">
    <div class="adm-page-head">
      <div>
        <div class="adm-crumbs">
          <a routerLink="/admin">Dashboard</a><span>›</span
          ><span>Payment Details</span>
        </div>
        <h2>Payment Details</h2>
        <p>
          {{
            userId
              ? "Payments for user " + userId + "."
              : "Payments recorded by the payment service."
          }}
          Status counts are on this page.
        </p>
      </div>
      <div class="adm-head-actions">
        <button
          class="adm-btn adm-primary"
          type="button"
          (click)="exportRows()"
          [disabled]="!visible().length"
        >
          Export
        </button>
      </div>
    </div>
    <div class="adm-stats">
      <article class="adm-card stat">
        <span class="k">Total payments</span><strong>{{ total() }}</strong
        ><span class="adm-ico grad-blue"><app-icon name="card" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">Successful on this page</span
        ><strong>{{ count(successStatuses) }}</strong
        ><span class="adm-ico grad-green"><app-icon name="check" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">Pending on this page</span
        ><strong>{{ count(pendingStatuses) }}</strong
        ><span class="adm-ico grad-amber"><app-icon name="clock" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">Failed on this page</span
        ><strong>{{ count(failedStatuses) }}</strong
        ><span class="adm-ico grad-red"><app-icon name="close" /></span>
      </article>
    </div>
    <app-status [busy]="busy()" [error]="error()" />
    <div class="adm-table-card">
      <form class="adm-filter" (ngSubmit)="apply()">
        <input
          name="user"
          [(ngModel)]="userId"
          placeholder="Customer or user id"
          aria-label="Customer or user id"
        />
        <select name="status" [(ngModel)]="status" aria-label="Status">
          <option value="">All statuses</option>
          @for (item of statuses; track item) {
            <option [value]="item">{{ item }}</option>
          }
        </select>
        <select
          name="method"
          [(ngModel)]="method"
          aria-label="Payment method on this page"
        >
          <option value="">All methods on this page</option>
          @for (item of methodOptions(); track item) {
            <option [value]="item">{{ item }}</option>
          }
        </select>
        <button class="adm-btn adm-primary" [disabled]="busy()">Filter</button>
      </form>
      <div class="adm-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Payment</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (row of visible(); track rowKey(row, $index)) {
              <tr>
                <td>{{ text(field(row, "code", "id")) }}</td>
                <td>
                  {{
                    text(field(row, "order_number", "codeOrder", "order_id"))
                  }}
                </td>
                <td>
                  <span class="adm-who">
                    <span class="adm-dot">{{ mark(row) }}</span>
                    <span
                      ><b>{{
                        text(
                          field(
                            row,
                            "user_id",
                            "userId",
                            "customer_id",
                            "customerId"
                          )
                        )
                      }}</b
                      ><small>User id</small></span
                    >
                  </span>
                </td>
                <td>{{ text(field(row, "payment_method", "method")) }}</td>
                <td>
                  <span
                    class="adm-badge"
                    [class.on]="tone(field(row, 'status')) === 'on'"
                    [class.off]="tone(field(row, 'status')) === 'off'"
                    [class.wait]="tone(field(row, 'status')) === 'wait'"
                    >{{ text(field(row, "status")) }}</span
                  >
                </td>
                <td>{{ usd(field(row, "amount")) }}</td>
                <td>{{ when(field(row, "payment_date", "datetime")) }}</td>
                <td class="adm-actions">
                  @if (linkId(row); as target) {
                    <a
                      class="adm-btn icon"
                      [routerLink]="['/admin/payments', target]"
                      aria-label="View payment"
                      ><app-icon name="eye"
                    /></a>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8">
                  <div class="adm-empty">
                    <strong>No payments</strong
                    ><span>No payments on this page.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="adm-pager">
        <span
          >{{ range() }}
          @if (method) {
            <span> · method filter is on this page</span>
          }
        </span>
        <span class="adm-pages">
          <button
            class="adm-btn icon"
            type="button"
            aria-label="Previous page"
            [disabled]="page <= 1 || busy()"
            (click)="goto(page - 1)"
          >
            <app-icon name="chevron" style="transform:rotate(180deg)" />
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
            class="adm-btn icon"
            type="button"
            aria-label="Next page"
            [disabled]="page >= pages() || busy()"
            (click)="goto(page + 1)"
          >
            <app-icon name="chevron" />
          </button>
          <select
            [ngModel]="size"
            (ngModelChange)="setSize($event)"
            aria-label="Rows per page"
          >
            @for (option of sizes; track option) {
              <option [ngValue]="option">{{ option }} / page</option>
            }
          </select>
        </span>
      </div>
    </div>
  </section>`,
})
export class PaymentsPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  statuses = [
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "PAID",
    "SUCCESS",
    "FAILED",
    "CANCELLED",
    "REFUNDED",
  ];
  successStatuses = successStatuses;
  pendingStatuses = pendingStatuses;
  failedStatuses = failedStatuses;
  rows = signal<Row[]>([]);
  total = signal(0);
  pages = signal(1);
  page = 1;
  size = 10;
  sizes = [10, 20, 50];
  status = "";
  userId = "";
  method = "";
  field = field;
  text = text;
  usd = usd;
  when = when;
  tone = tone;
  constructor() {
    super();
    this.route.queryParamMap.subscribe((params) => {
      this.userId = params.get("user") || "";
      this.page = 1;
      this.load();
    });
  }
  load() {
    this.run(
      this.api.payments(this.page, this.status, this.userId, this.size),
      (result) => {
        this.rows.set(result.items);
        this.total.set(result.total);
        this.pages.set(result.pages);
      },
    );
  }
  apply() {
    this.page = 1;
    this.load();
  }
  visible() {
    const method = this.method.trim().toLowerCase();
    if (!method) return this.rows();
    return this.rows().filter(
      (row) =>
        String(field(row, "payment_method", "method")).toLowerCase() === method,
    );
  }
  methodOptions() {
    const values = new Set<string>();
    if (this.method.trim()) values.add(this.method.trim());
    for (const row of this.rows()) {
      const value = String(field(row, "payment_method", "method") || "").trim();
      if (value) values.add(value);
    }
    return [...values];
  }
  count(statuses: string[]) {
    const wanted = new Set(statuses);
    return this.visible().filter((row) =>
      wanted.has(String(field(row, "status")).toUpperCase()),
    ).length;
  }
  mark(row: Row) {
    return String(
      field(row, "user_id", "userId", "customer_id", "customerId") || "?",
    )
      .slice(0, 1)
      .toUpperCase();
  }
  // Detail route is the order id: PaymentDetailPage calls paymentByOrder.
  linkId(row: Row) {
    if (field(row, "id", "code") === "") return "";
    return field(row, "order_id", "orderId") || field(row, "id");
  }
  rowKey(row: Row, index: number) {
    return String(field(row, "id", "code") || index);
  }
  range() {
    if (!this.total() || !this.rows().length) return "Showing 0 results";
    const start = (this.page - 1) * this.size + 1;
    const end = start + this.rows().length - 1;
    return `Showing ${start} to ${end} of ${this.total()} results`;
  }
  pageList() {
    const last = this.pages();
    const start = Math.max(1, this.page - 2);
    const end = Math.min(last, start + 4);
    const numbers = [];
    for (let n = Math.max(1, end - 4); n <= end; n++) numbers.push(n);
    return numbers;
  }
  goto(page: number) {
    if (page === this.page || page < 1 || page > this.pages()) return;
    this.page = page;
    this.load();
  }
  setSize(size: number) {
    this.size = Number(size);
    this.page = 1;
    this.load();
  }
  exportRows() {
    const lines = [
      ["payment", "order", "user", "method", "status", "amount", "date"],
      ...this.visible().map((row) => [
        field(row, "code", "id"),
        field(row, "order_number", "codeOrder", "order_id"),
        field(row, "user_id", "userId", "customer_id", "customerId"),
        field(row, "payment_method", "method"),
        field(row, "status"),
        field(row, "amount"),
        field(row, "payment_date", "datetime"),
      ]),
    ];
    const csv = lines
      .map((cols) =>
        cols
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "payments.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
}
@Component({
  imports: [Status, RouterLink],
  template: `<section class="adm-stack">
    <div class="adm-page-head">
      <div>
        <div class="adm-crumbs">
          <a routerLink="/admin">Dashboard</a><span>›</span
          ><a routerLink="/admin/payments">Payment Details</a><span>›</span
          ><span>{{ id }}</span>
        </div>
        <h2>Payment for order {{ id }}</h2>
        <p><a routerLink="/admin/payments">Back to payments</a></p>
      </div>
    </div>
    <app-status [busy]="busy()" [error]="error()" />
    @if (row(); as current) {
      <article class="adm-panel">
        <div class="adm-section-title">
          <h3>Payment</h3>
          <p>Fields returned for this order.</p>
        </div>
        <div class="adm-kv">
          @for (item of facts(current); track item.label) {
            <span>{{ item.label }}</span>
            @if (item.label === "Status") {
              <strong
                ><span
                  class="adm-badge"
                  [class.on]="tone(field(current, 'status')) === 'on'"
                  [class.off]="tone(field(current, 'status')) === 'off'"
                  [class.wait]="tone(field(current, 'status')) === 'wait'"
                  >{{ item.value }}</span
                ></strong
              >
            } @else {
              <strong>{{ item.value }}</strong>
            }
          }
        </div>
      </article>
    }
  </section>`,
})
export class PaymentDetailPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  row = signal<Row | null>(null);
  id = 0;
  field = field;
  text = text;
  usd = usd;
  when = when;
  tone = tone;
  constructor() {
    super();
    this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get("id"));
      this.run(this.api.paymentByOrder(this.id), (row) => this.row.set(row));
    });
  }
  facts(row: Row) {
    return [
      { label: "Payment", value: text(field(row, "id")) },
      { label: "Order", value: text(field(row, "order_number", "order_id")) },
      { label: "Method", value: text(field(row, "payment_method")) },
      { label: "Provider", value: text(field(row, "payment_provider")) },
      { label: "Status", value: text(field(row, "status")) },
      { label: "Amount", value: usd(field(row, "amount")) },
      { label: "Currency", value: text(field(row, "currency") || "USD") },
      { label: "Date", value: when(field(row, "payment_date")) },
    ];
  }
}
