import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";
import { AuthService } from "../../../core/auth/auth.service";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text, tone, usd, when } from "../api/admin.api";
const statuses = ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"];
const successStatuses = ["SUCCESS", "COMPLETED", "PAID"];
const pendingStatuses = ["PENDING"];
const failedStatuses = ["FAILED", "CANCELLED"];
@Component({
  imports: [TranslatePipe, Status, FormsModule, RouterLink, Icon],
  template: `<section class="adm-stack">
    <div class="adm-page-head">
      <div>
        <div class="adm-crumbs">
          <a routerLink="/admin">{{ "Dashboard" | translate }}</a><span>›</span
          ><span>{{ "Transactions" | translate }}</span>
        </div>
        <h2>{{ "Transactions" | translate }}</h2>
        <p>
          {{
            customerId
              ? "Transactions for customer " + customerId + "."
              : "Payment transactions. Status filters use the server values."
          }}
          Status counts are on this page.
        </p>
      </div>
    </div>
    <div class="adm-stats">
      <article class="adm-card stat">
        <span class="k">Total transactions</span><strong>{{ total() }}</strong
        ><span class="adm-ico grad-blue"><app-icon name="list" /></span>
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
          name="customer"
          [(ngModel)]="customerId"
          [placeholder]='"Customer id" | translate'
          [attr.aria-label]='"Customer id" | translate'
        />
        <select name="status" [(ngModel)]="status" [attr.aria-label]='"Status" | translate'>
          <option value="">{{ "All statuses" | translate }}</option>
          @for (item of statuses; track item) {
            <option [value]="item">{{ item }}</option>
          }
        </select>
        <button class="adm-btn adm-primary" [disabled]="busy()">{{ "Filter" | translate }}</button>
      </form>
      <div class="adm-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Transaction no</th>
              <th>{{ "Order" | translate }}</th>
              <th>{{ "Customer" | translate }}</th>
              <th>Method</th>
              <th>{{ "Amount" | translate }}</th>
              <th>{{ "Status" | translate }}</th>
              <th>{{ "Date" | translate }}</th>
              <th>{{ "Action" | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track field(row, "id") || $index) {
              <tr>
                <td>
                  {{ text(field(row, "transaction_no", "transactionNo")) }}
                </td>
                <td>{{ text(field(row, "order_id", "orderId")) }}</td>
                <td>
                  <span class="adm-who">
                    <span class="adm-dot">{{ mark(row) }}</span>
                    <span
                      ><b>{{ text(field(row, "customer_id", "customerId")) }}</b
                      ><small>{{ account(row) }}</small></span
                    >
                  </span>
                </td>
                <td>{{ text(field(row, "payment_method", "method")) }}</td>
                <td>{{ usd(field(row, "amount")) }}</td>
                <td>
                  <span
                    class="adm-badge"
                    [class.on]="tone(field(row, 'status')) === 'on'"
                    [class.off]="tone(field(row, 'status')) === 'off'"
                    [class.wait]="tone(field(row, 'status')) === 'wait'"
                    >{{ text(field(row, "status")) }}</span
                  >
                </td>
                <td>
                  {{
                    when(
                      field(
                        row,
                        "createdAt",
                        "created_at",
                        "datetime",
                        "payment_date"
                      )
                    )
                  }}
                </td>
                <td class="adm-actions">
                  @if (field(row, "id") !== "") {
                    <a
                      class="adm-btn icon"
                      [routerLink]="['/admin/transactions', field(row, 'id')]"
                      aria-label="View transaction"
                      ><app-icon name="eye"
                    /></a>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8">
                  <div class="adm-empty">
                    <strong>No transactions</strong
                    ><span>No transactions on this page.</span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="adm-pager">
        <span>{{ range() }}</span>
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
export class TransactionsPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  statuses = statuses;
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
  customerId = "";
  field = field;
  text = text;
  usd = usd;
  when = when;
  tone = tone;
  constructor() {
    super();
    this.route.queryParamMap.subscribe((params) => {
      this.customerId = params.get("customer") || "";
      this.page = 1;
      this.load();
    });
  }
  load() {
    this.run(
      this.api.transactions(this.page, this.status, this.customerId, this.size),
      (result) => {
        this.rows.set(result.items);
        this.pages.set(result.pages);
        this.total.set(result.total);
      },
    );
  }
  apply() {
    this.page = 1;
    this.load();
  }
  count(statuses: string[]) {
    const wanted = new Set(statuses);
    return this.rows().filter((row) =>
      wanted.has(String(field(row, "status")).toUpperCase()),
    ).length;
  }
  mark(row: Row) {
    return String(field(row, "customer_id", "customerId") || "?")
      .slice(0, 1)
      .toUpperCase();
  }
  account(row: Row) {
    const masked = text(field(row, "masked_account", "maskedAccount"));
    return masked === "—" ? "Customer id" : masked;
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
}
@Component({
  imports: [TranslatePipe, Status, RouterLink, FormsModule],
  template: `<section class="adm-stack">
    <div class="adm-page-head">
      <div>
        <div class="adm-crumbs">
          <a routerLink="/admin">{{ "Dashboard" | translate }}</a><span>›</span
          ><a routerLink="/admin/transactions">{{ "Transactions" | translate }}</a><span>›</span
          ><span>{{ text(field(row() || {}, "transaction_no")) }}</span>
        </div>
        <h2>Transaction {{ text(field(row() || {}, "transaction_no")) }}</h2>
        <p><a routerLink="/admin/transactions">Back to transactions</a></p>
      </div>
    </div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (row(); as current) {
      <div class="adm-split">
        <article class="adm-panel">
          <div class="adm-section-title">
            <div>
              <h3>{{ usd(field(current, "amount")) }}</h3>
              <p>
                <span
                  class="adm-badge"
                  [class.on]="tone(field(current, 'status')) === 'on'"
                  [class.off]="tone(field(current, 'status')) === 'off'"
                  [class.wait]="tone(field(current, 'status')) === 'wait'"
                  >{{ text(field(current, "status")) }}</span
                >
              </p>
            </div>
          </div>
          <div class="adm-kv">
            <span>Number</span
            ><strong>{{ text(field(current, "transaction_no")) }}</strong>
            <span>{{ "Order" | translate }}</span
            ><strong>{{ text(field(current, "order_id")) }}</strong>
            <span>{{ "Customer" | translate }}</span
            ><strong>{{ text(field(current, "customer_id")) }}</strong>
            <span>Method</span
            ><strong>{{ text(field(current, "payment_method")) }}</strong>
            <span>{{ "Account" | translate }}</span
            ><strong>{{
              text(field(current, "masked_account", "maskedAccount"))
            }}</strong>
            <span>Created</span
            ><strong>{{
              when(field(current, "createdAt", "created_at"))
            }}</strong>
            <span>Updated</span
            ><strong>{{
              when(field(current, "updatedAt", "updated_at"))
            }}</strong>
            <span>{{ "Remarks" | translate }}</span
            ><strong>{{ text(field(current, "remarks")) }}</strong>
          </div>
        </article>
        <form class="adm-form adm-panel" (ngSubmit)="save()">
          <div class="adm-section-title">
            <h3>Update status</h3>
            <p>The reason is stored with the status change.</p>
          </div>
          <label
            >New status<select name="next" [(ngModel)]="next">
              @for (item of statuses; track item) {
                <option [value]="item">{{ item }}</option>
              }
            </select></label
          >
          <label
            >{{ "Reason" | translate }}<input name="reason" [(ngModel)]="reason" required
          /></label>
          <button class="adm-btn adm-primary" [disabled]="busy()">
            Update status
          </button>
        </form>
      </div>
      @if (history().length) {
        <article class="adm-panel">
          <h3>Status history</h3>
          <div class="adm-kv">
            @for (item of history(); track $index) {
              <span>{{ text(field(item, "new_status", "newStatus")) }}</span>
              <strong
                >{{ when(field(item, "changed_at", "changedAt")) }} ·
                {{
                  text(field(item, "changed_by", "changedBy", "reason"))
                }}</strong
              >
            }
          </div>
        </article>
      }
    }
  </section>`,
})
export class TransactionDetailPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  statuses = statuses;
  row = signal<Row | null>(null);
  history = signal<Row[]>([]);
  next = "PENDING";
  reason = "";
  field = field;
  text = text;
  usd = usd;
  when = when;
  tone = tone;
  constructor() {
    super();
    this.route.paramMap.subscribe((params) =>
      this.open(Number(params.get("id"))),
    );
  }
  open(id: number) {
    this.run(
      forkJoin({
        row: this.api.transaction(id),
        history: this.api
          .transactionStatusHistory(id)
          .pipe(catchError(() => of([] as Row[]))),
      }),
      (result) => {
        this.row.set(result.row);
        this.history.set(result.history);
        this.next = String(field(result.row, "status") || "PENDING");
      },
    );
  }
  save() {
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
        this.api.transactionStatusHistory(id).subscribe({
          next: (history) => this.history.set(history),
          error: () => undefined,
        });
      },
    );
  }
}
