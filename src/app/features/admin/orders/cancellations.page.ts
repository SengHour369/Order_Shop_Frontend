import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text, tone, usd, when } from "../api/admin.api";
const statuses = [
  "REQUESTED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELED",
  "CLOSED",
];
@Component({
  imports: [TranslatePipe, Status, FormsModule, RouterLink, Icon],
  template: `<section>
    <div class="adm-page-head">
      <div>
        <h2>{{ "Cancellations" | translate }}</h2>
        <p>Review and process order cancelation requests.</p>
      </div>
    </div>
    <div class="adm-stats">
      <article class="adm-card stat">
        <span class="k">Total cancellations</span>
        <strong>{{
          text(
            field(summary() || {}, "totalCancelations", "total_cancelations")
          )
        }}</strong>
        <span class="adm-ico grad-red"><app-icon name="close" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">Pending review</span>
        <strong>{{
          text(field(summary() || {}, "pendingReview", "pending_review"))
        }}</strong>
        <span class="adm-ico grad-amber"><app-icon name="clock" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">Cancelation rate</span>
        <strong>{{ rate() }}</strong>
        <span class="adm-ico grad-blue"><app-icon name="chart" /></span>
      </article>
      <article class="adm-card stat">
        <span class="k">Value lost</span>
        <strong>{{ money(summary(), "valueLost", "value_lost") }}</strong>
        <span class="adm-ico grad-violet"><app-icon name="card" /></span>
      </article>
    </div>
    <app-status [busy]="busy()" [error]="error()" />
    <div class="adm-table-card">
      <form class="adm-filter" (ngSubmit)="page = 1; load()">
        <input name="order" [(ngModel)]="orderNo" placeholder="Order number" />
        <input
          name="customer"
          [(ngModel)]="customerName"
          placeholder="Customer name"
        />
        <select name="status" [(ngModel)]="cancelStatus">
          <option value="">{{ "All statuses" | translate }}</option>
          @for (item of statuses; track item) {
            <option [value]="item">{{ pretty(item) }}</option>
          }
        </select>
        <button class="adm-btn adm-primary" [disabled]="busy()">{{ "Filter" | translate }}</button>
      </form>
      <div class="adm-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ "Order ID" | translate }}</th>
              <th>{{ "Customer" | translate }}</th>
              <th>Cancel date</th>
              <th>{{ "Reason" | translate }}</th>
              <th>{{ "Amount" | translate }}</th>
              <th>{{ "Actions" | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track field(row, "orderNo", "order_no")) {
              <tr>
                <td>{{ text(field(row, "orderNo", "order_no")) }}</td>
                <td>
                  <div class="adm-who">
                    <span class="adm-dot">{{
                      initial(text(field(row, "customerName", "customer_name")))
                    }}</span>
                    <b>{{
                      text(field(row, "customerName", "customer_name"))
                    }}</b>
                  </div>
                </td>
                <td>{{ when(field(row, "cancelDate", "cancel_date")) }}</td>
                <td>{{ text(field(row, "cancelReason", "cancel_reason")) }}</td>
                <td>{{ usd(field(row, "amount")) }}</td>
                <td>
                  <button class="adm-btn" type="button" (click)="open(row)">
                    <app-icon name="eye" /> View
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">No cancellations found</td>
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
          Page {{ page }} of {{ pages() }}
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
    @if (detail(); as current) {
      <button
        class="adm-drawer-back"
        type="button"
        aria-label="Close cancellation"
        (click)="detail.set(null)"
      ></button>
      <aside class="adm-drawer">
        <div class="adm-page-head">
          <div>
            <h2>{{ text(field(current, "orderNo", "order_no")) }}</h2>
            <p>{{ text(field(current, "cancelationId", "cancelation_id")) }}</p>
          </div>
          <button class="adm-btn" type="button" (click)="detail.set(null)">
            {{ "Close" | translate }}
          </button>
        </div>
        <app-status [busy]="detailBusy()" [error]="detailError()" />
        <p>
          <span
            class="adm-badge"
            [class.on]="
              tone(field(current, 'cancelStatus', 'cancel_status')) === 'on'
            "
            [class.off]="
              tone(field(current, 'cancelStatus', 'cancel_status')) === 'off'
            "
            [class.wait]="
              tone(field(current, 'cancelStatus', 'cancel_status')) === 'wait'
            "
            >{{ text(field(current, "cancelStatus", "cancel_status")) }}</span
          >
        </p>
        <div class="adm-kv">
          <span>{{ "Customer" | translate }}</span
          ><b>{{ text(field(current, "customerName", "customer_name")) }}</b>
          <span>{{ "Customer id" | translate }}</span
          ><b>{{ text(field(current, "customerId", "customer_id")) }}</b>
          <span>{{ "Amount" | translate }}</span><b>{{ usd(field(current, "amount")) }}</b>
          <span>{{ "Currency" | translate }}</span><b>{{ text(field(current, "currency")) }}</b>
          <span>Source</span
          ><b>{{ text(field(current, "cancelSource", "cancel_source")) }}</b>
          <span>{{ "Cancelled" | translate }}</span
          ><b>{{ when(field(current, "cancelDate", "cancel_date")) }}</b>
        </div>
        <article class="adm-panel" style="margin-top:14px">
          <h3>{{ "Reason" | translate }}</h3>
          <p>{{ text(field(current, "cancelReason", "cancel_reason")) }}</p>
          <p>{{ text(field(current, "remark")) }}</p>
          <p>
            Reviewed {{ when(field(current, "reviewedAt", "reviewed_at")) }} by
            {{ text(field(current, "reviewedBy", "reviewed_by")) }}
          </p>
          @if (field(current, "orderId", "order_id")) {
            <a
              class="adm-btn"
              [routerLink]="[
                '/admin/orders',
                field(current, 'orderId', 'order_id'),
              ]"
              >Open order</a
            >
          }
        </article>
      </aside>
    }
  </section>`,
})
export class CancellationsPage extends PageState {
  private api = inject(AdminApi);
  rows = signal<Row[]>([]);
  summary = signal<Row | null>(null);
  pages = signal(1);
  page = 1;
  size = 10;
  sizes = [10, 20, 50];
  orderNo = "";
  customerName = "";
  cancelStatus = "";
  statuses = statuses;
  detail = signal<Row | null>(null);
  detailBusy = signal(false);
  detailError = signal("");
  field = field;
  text = text;
  usd = usd;
  when = when;
  tone = tone;
  constructor() {
    super();
    this.load();
  }
  load() {
    this.run(
      forkJoin({
        list: this.api.cancellations(
          this.page,
          this.orderNo,
          this.customerName,
          this.cancelStatus,
          this.size,
        ),
        summary: this.api.cancellationSummary(),
      }),
      (result) => {
        this.rows.set(result.list.items);
        this.pages.set(result.list.pages);
        this.summary.set(result.summary);
      },
    );
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
  rate() {
    const value = field(
      this.summary() || {},
      "cancelationRate",
      "cancelation_rate",
    );
    const number = Number(value);
    return Number.isFinite(number) && value !== "" ? `${number}%` : "—";
  }
  money(row: Row | null, ...keys: string[]) {
    const value = field(row || {}, ...keys);
    return value === "" ? "—" : usd(value);
  }
  pretty(value: unknown) {
    const raw = String(value ?? "");
    if (!raw) return "";
    const clean = raw.toLowerCase().replace(/_/g, " ");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  initial(name: string) {
    if (!name || name === "—") return "?";
    const letter = name.trim().charAt(0);
    return letter ? letter.toUpperCase() : "?";
  }
  open(row: Row) {
    const orderNo = String(field(row, "orderNo", "order_no"));
    this.detail.set(row);
    this.detailBusy.set(true);
    this.detailError.set("");
    this.api.cancellation(orderNo).subscribe({
      next: (current) => {
        this.detail.set(current);
        this.detailBusy.set(false);
      },
      error: (e) => {
        this.detailError.set(
          e.error?.message || e.message || "Could not load this cancellation.",
        );
        this.detailBusy.set(false);
      },
    });
  }
}
