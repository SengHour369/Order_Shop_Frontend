import { ProductImage } from "../../shared/product-image";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, forkJoin, of, switchMap, map } from "rxjs";
import { PageState } from "../../shared/page-state";
import { Icon } from "../../shared/icon";
import { Status } from "../../shared/status";
import { AdminApi, field, Row, text, tone, usd, when } from "./admin.api";
import { related } from "./refunds.page";
const returnStatuses = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "INSPECTING",
  "COMPLETED",
];
@Component({
  imports: [Status, RouterLink, FormsModule, Icon, ProductImage],
  templateUrl: "./returns-list.html",
  styleUrl: "./reference.css",
})
export class ReturnsPage extends PageState {
  private api = inject(AdminApi);
  rows = signal<Row[]>([]);
  summary = signal<Row | null>(null);
  pages = signal(1);
  page = 1;
  size = 10;
  sizes = [10, 20, 50];
  status = "";
  query = "";
  total = signal(0);
  method = "";
  from = "";
  to = "";
  filtersOpen = false;
  selected = new Set<string>();
  when = when;
  typeFilter = "";
  returnStatuses = returnStatuses;
  creating = signal(false);
  orderNumber = "";
  found = signal<Row | null>(null);
  lines = signal<Row[]>([]);
  lineIndex = -1;
  productId = 0;
  returnType = "REFUND";
  reason = "";
  amount = 0;
  lookupError = signal("");
  field = field;
  text = text;
  usd = usd;
  tone = tone;
  constructor() {
    super();
    this.load();
  }
  load() {
    this.run(
      forkJoin({
        list: this.api
          .returns(this.page, this.status.trim(), this.size, {
            ...(this.query.trim()
              ? /^ord/i.test(this.query.trim())
                ? { order_no: this.query.trim() }
                : /^ret(?:urn)?[-\d]/i.test(this.query.trim())
                  ? { return_id: this.query.trim() }
                  : { customer_name: this.query.trim() }
              : {}),
            ...(this.from ? { from_date: this.from } : {}),
            ...(this.to ? { to_date: this.to } : {}),
            ...(this.typeFilter ? { return_type: this.typeFilter } : {}),
          })
          .pipe(
            switchMap((result) =>
              result.items.length
                ? forkJoin(
                    result.items.map((row) =>
                      this.api.returnDetail(String(row["return_id"])).pipe(
                        catchError(() => of(row)),
                        switchMap((detail) =>
                          related(this.api, detail).pipe(
                            map((extra) => ({ ...row, ...detail, ...extra })),
                          ),
                        ),
                      ),
                    ),
                  ).pipe(map((items) => ({ ...result, items })))
                : of(result),
            ),
          ),
        summary: this.api.returnSummary(),
      }),
      (result) => {
        this.rows.set(result.list.items);
        this.pages.set(result.list.pages);
        this.total.set(result.list.total);
        this.selected.clear();
        this.summary.set(result.summary);
      },
    );
  }
  clearClient() {
    this.query = "";
    this.typeFilter = "";
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
  visible() {
    const q = this.query.trim().toLowerCase();
    const type = this.typeFilter.trim().toLowerCase();
    return this.rows().filter((row) => {
      const rowType = String(
        field(row, "return_type", "returnType"),
      ).toLowerCase();
      if (type && rowType !== type) return false;
      if (
        this.method &&
        !JSON.stringify(row["payment"] || {})
          .toUpperCase()
          .includes(this.method)
      )
        return false;
      if (!q) return true;
      const hay = [
        field(row, "return_id", "returnId"),
        field(row, "order_no", "orderNo"),
        field(row, "reason"),
        this.customerName(row),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  customerName(row: Row) {
    const c = (row["customer"] || {}) as Row;
    return String(
      field(c, "fullName", "full_name", "username", "name") ||
        field(row, "customer_name") ||
        "Customer",
    );
  }
  productsOf(row: Row) {
    const rows = Array.isArray(row["products"])
      ? (row["products"] as Row[])
      : [];
    const id = Number(row["product_id"]);
    return id ? rows.filter((p) => Number(p["product_id"]) === id) : rows;
  }
  returnTone(row: Row) {
    const s = String(row["status"]);
    return s === "REJECTED"
      ? "failed"
      : s === "COMPLETED"
        ? "processed"
        : s === "APPROVED"
          ? "complete"
          : "pending";
  }
  stats() {
    const s = this.summary() || {};
    return [
      {
        label: "Total Returns",
        value: field(s, "total_returns"),
        note: "All time",
        icon: "box",
        tone: "violet",
      },
      {
        label: "Pending Review",
        value: field(s, "pending_returns"),
        note: "Awaiting review",
        icon: "clock",
        tone: "amber",
      },
      {
        label: "Approved",
        value: this.rows().filter((r) => r["status"] === "APPROVED").length,
        note: "On this page",
        icon: "check",
        tone: "green",
      },
      {
        label: "Processed",
        value: field(s, "processed_returns"),
        note: "All time",
        icon: "truck",
        tone: "blue",
      },
      {
        label: "Rejected",
        value: this.rows().filter((r) => r["status"] === "REJECTED").length,
        note: "On this page",
        icon: "close",
        tone: "red",
      },
    ];
  }
  range() {
    return this.total()
      ? `Showing ${(this.page - 1) * this.size + 1} to ${(this.page - 1) * this.size + this.rows().length} of ${this.total()} entries`
      : "Showing 0 entries";
  }
  selectRow(id: string, checked: boolean) {
    checked ? this.selected.add(id) : this.selected.delete(id);
  }
  selectAll(checked: boolean) {
    this.visible().forEach((r) =>
      this.selectRow(String(r["return_id"]), checked),
    );
  }
  exportRows() {
    const rows = this.visible().filter(
      (r) => !this.selected.size || this.selected.has(String(r["return_id"])),
    );
    const keys = [
      "return_id",
      "order_no",
      "amount",
      "status",
      "requested_at",
      "completed_at",
    ];
    const csv = [
      keys.join(","),
      ...rows.map((r) =>
        keys
          .map((k) => '"' + String(r[k] ?? "").replaceAll('"', '""') + '"')
          .join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "returns.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  percent(row: Row | null, ...keys: string[]) {
    const value = field(row || {}, ...keys);
    if (value === "") return "—";
    const number = Number(value);
    return Number.isFinite(number) ? `${number}%` : text(value);
  }
  pretty(value: unknown) {
    const raw = String(value ?? "");
    if (!raw) return "";
    const clean = raw.toLowerCase().replace(/_/g, " ");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  lookupOrder() {
    this.lookupError.set("");
    this.found.set(null);
    this.lines.set([]);
    this.lineIndex = -1;
    this.productId = 0;
    this.amount = 0;
    this.run(
      this.api.orderByNumber(this.orderNumber.trim()).pipe(
        switchMap((order) =>
          related(this.api, {
            order_no: this.orderNumber.trim(),
            customer_id: field(order, "customer_id"),
          }).pipe(map((extra) => ({ order, lines: extra.products }))),
        ),
      ),
      (result) => {
        this.found.set(result.order);
        this.lines.set(result.lines);
      },
    );
  }
  applyLine() {
    const line = this.lines()[this.lineIndex];
    if (!line) return;
    this.productId = Number(field(line, "product_id"));
    const total = Number(field(line, "total_price"));
    if (Number.isFinite(total) && total > 0) this.amount = total;
  }
  submitReturn() {
    const order = this.found();
    if (!order) return;
    const line = this.lines()[this.lineIndex];
    if (
      !line ||
      !Number.isSafeInteger(this.productId) ||
      this.productId < 1 ||
      !this.reason.trim() ||
      !Number.isFinite(this.amount) ||
      this.amount <= 0 ||
      this.amount > Number(line["total_price"])
    ) {
      this.error.set(
        "Choose a product from this order, enter a reason, and use an amount no greater than its line total.",
      );
      return;
    }
    this.run(
      this.api.createReturn({
        order_id: Number(field(order, "id")),
        customer_id: Number(field(order, "customer_id")),
        product_id: this.productId,
        return_type: this.returnType,
        reason: this.reason,
        amount: this.amount,
      }),
      () => {
        this.creating.set(false);
        this.found.set(null);
        this.load();
        this.message.set("Return requested.");
      },
    );
  }
}
@Component({
  imports: [Status, RouterLink, FormsModule],
  template: `<section>
    <div class="adm-page-head">
      <div>
        <h2>Return Details</h2>
        <p><a routerLink="/admin/returns">Returns</a> · {{ id }}</p>
      </div>
    </div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (row(); as current) {
      <div
        class="adm-stats"
        style="grid-template-columns:repeat(3,minmax(0,1fr))"
      >
        <article class="adm-card">
          <span
            >Return ID:
            {{ text(field(current, "return_id", "returnId")) }}</span
          >
          <strong style="font-size:28px">{{
            usd(field(current, "amount"))
          }}</strong>
          <em
            >{{ text(field(current, "status")) }} ·
            {{ when(field(current, "requested_at", "requestedAt")) }}</em
          >
        </article>
        <article class="adm-panel">
          <h3>Customer Details</h3>
          <div class="adm-who">
            <span class="adm-dot">{{ initial(current) }}</span>
            <span>
              <b>{{ text(field(current, "customer_name", "customerName")) }}</b>
              <small
                >Id
                {{ text(field(current, "customer_id", "customerId")) }}</small
              >
            </span>
          </div>
        </article>
        <article class="adm-panel">
          <h3>Associated Order & Product</h3>
          <div class="adm-kv">
            <span>Order ID</span
            ><b>{{ text(field(current, "order_no", "orderNo")) }}</b>
            <span>Product</span
            ><b>{{
              text(
                field(
                  current,
                  "product_name",
                  "productName",
                  "product_id",
                  "productId"
                )
              )
            }}</b>
            <span>Return type</span
            ><b>{{ text(field(current, "return_type", "returnType")) }}</b>
          </div>
        </article>
      </div>
      <div class="adm-work" style="margin-top:14px">
        <div class="adm-stack">
          <article class="adm-panel">
            <h3>Return Information</h3>
            <div class="adm-kv">
              <span>Return reason</span
              ><b>{{ text(field(current, "reason")) }}</b>
              <span>Current status</span
              ><b>{{ text(field(current, "status")) }}</b>
              <span>Return type</span
              ><b>{{ text(field(current, "return_type", "returnType")) }}</b>
              <span>Remark</span><b>{{ text(field(current, "remark")) }}</b>
              <span>Requested</span
              ><b>{{ when(field(current, "requested_at", "requestedAt")) }}</b>
              <span>Requested by</span
              ><b>{{ text(field(current, "requested_by", "requestedBy")) }}</b>
            </div>
          </article>
          <article class="adm-panel">
            <h3>Action Panel</h3>
            @if (statusOf(current) === "REQUESTED") {
              <form class="adm-form full" (ngSubmit)="$event.preventDefault()">
                <label>
                  Remark
                  <span class="adm-optional">(Optional for approval)</span>
                  <textarea
                    name="remark"
                    rows="4"
                    [(ngModel)]="remark"
                    placeholder="e.g. Return meets policy requirements..."
                  ></textarea>
                </label>
                <p class="adm-help">
                  Decide whether this return qualifies before the customer ships
                  anything back. A rejection reason is required.
                </p>
                <div class="adm-actions">
                  <button
                    class="adm-btn ok"
                    type="button"
                    [disabled]="busy()"
                    (click)="act('approve')"
                  >
                    Approve Return
                  </button>
                  <button
                    class="adm-btn stop"
                    type="button"
                    [disabled]="busy()"
                    (click)="act('reject')"
                  >
                    Reject Return
                  </button>
                </div>
              </form>
            } @else if (statusOf(current) === "APPROVED") {
              <form class="adm-form full" (ngSubmit)="act('receive')">
                <label>
                  Remark
                  <span class="adm-req">*</span>
                  <textarea
                    name="remark"
                    rows="4"
                    [(ngModel)]="remark"
                    placeholder="e.g. Package received in good condition at warehouse..."
                  ></textarea>
                </label>
                <p class="adm-help">
                  Log this once the item physically arrives at the warehouse. A
                  remark is required.
                </p>
                <button class="adm-btn adm-primary" [disabled]="busy()">
                  Mark as Received
                </button>
              </form>
            } @else if (statusOf(current) === "RECEIVED") {
              <button
                class="adm-btn adm-primary"
                type="button"
                [disabled]="busy()"
                (click)="act('inspect/start')"
              >
                Start Inspection
              </button>
              <p class="adm-help">
                Next step: mark inspection as Passed or Failed.
              </p>
            } @else if (statusOf(current) === "INSPECTING") {
              <form class="adm-form full" (ngSubmit)="$event.preventDefault()">
                <label>
                  Remark
                  <span class="adm-req">*</span>
                  <textarea
                    name="remark"
                    rows="4"
                    [(ngModel)]="remark"
                    placeholder="e.g. Item is in perfect condition, no damage found..."
                  ></textarea>
                </label>
                <p class="adm-help">
                  This decision determines whether a refund is created or the
                  return is rejected. Inspection notes are required.
                </p>
                <div class="adm-actions">
                  <button
                    class="adm-btn ok"
                    type="button"
                    [disabled]="busy()"
                    (click)="act('inspect/complete', true)"
                  >
                    Mark Passed
                  </button>
                  <button
                    class="adm-btn stop"
                    type="button"
                    [disabled]="busy()"
                    (click)="act('inspect/complete', false)"
                  >
                    Mark Failed
                  </button>
                </div>
              </form>
            } @else if (statusOf(current) === "COMPLETED") {
              <div class="adm-note ok">
                <div>
                  <strong>Inspection passed — return completed</strong>
                  <p>
                    Refund and inventory processes are complete or pending
                    external settlement.
                  </p>
                </div>
              </div>
            } @else if (statusOf(current) === "REJECTED") {
              <div class="adm-note stop">
                <div>
                  <strong>Return Rejected</strong>
                  <p>The return request was rejected.</p>
                </div>
              </div>
            }
          </article>
        </div>
        <div class="adm-stack">
          <article class="adm-panel">
            <h3>Items in Return</h3>
            <div class="adm-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Refund amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {{
                        text(
                          field(
                            current,
                            "product_name",
                            "productName",
                            "product_id",
                            "productId"
                          )
                        )
                      }}
                    </td>
                    <td>{{ usd(field(current, "amount")) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
          <article class="adm-panel">
            <h3>Return Timeline</h3>
            @if (events(current).length) {
              <div class="adm-kv">
                @for (event of events(current); track event.label + event.at) {
                  <span>{{ event.label }}</span>
                  <b
                    >{{ when(event.at) }}
                    @if (event.by) {
                      · {{ event.by }}
                    }
                  </b>
                }
              </div>
            } @else {
              <div class="adm-empty">
                <strong>No history events yet.</strong>
                <p>Status {{ text(field(current, "status")) }}</p>
              </div>
            }
          </article>
        </div>
      </div>
    }
  </section>`,
})
export class ReturnDetailPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  row = signal<Row | null>(null);
  history = signal<Row[]>([]);
  id = "";
  remark = "";
  field = field;
  text = text;
  usd = usd;
  when = when;
  constructor() {
    super();
    this.route.paramMap.subscribe((params) => {
      this.id = params.get("id") || "";
      this.run(
        forkJoin({
          row: this.api.returnDetail(this.id),
          history: this.api
            .returnHistory(this.id)
            .pipe(catchError(() => of([] as Row[]))),
        }),
        (result) => {
          this.row.set(result.row);
          this.history.set(result.history);
        },
      );
    });
  }
  statusOf(row: Row) {
    return String(field(row, "status") || "").toUpperCase();
  }
  act(action: string, passed?: boolean) {
    const remark = this.remark.trim();
    if (action === "reject" && !remark) {
      this.error.set("A rejection reason is required.");
      return;
    }
    if (action === "receive" && !remark) {
      this.error.set("A remark is required to mark as received.");
      return;
    }
    if (action === "inspect/complete" && !remark) {
      this.error.set(
        passed
          ? "Inspection notes are required."
          : "A failure reason is required.",
      );
      return;
    }
    if (
      action === "inspect/start" &&
      !confirm("This will begin the inspection process for the returned item.")
    )
      return;
    this.run(
      this.api.returnAction(
        this.id,
        action,
        action === "inspect/start" ? "" : remark,
        passed,
      ),
      (row) => {
        this.row.set(row);
        this.remark = "";
        this.message.set("Return updated.");
      },
    );
  }
  initial(row: Row) {
    const name = String(field(row, "customer_name", "customerName"));
    const letter = name.trim().charAt(0);
    return letter ? letter.toUpperCase() : "?";
  }
  events(row: Row) {
    const logged = this.history()
      .map((item) => ({
        label: String(field(item, "newStatus", "new_status") || "Updated"),
        at: field(item, "changedAt", "changed_at"),
        by: String(field(item, "changedBy", "changed_by", "remark") || ""),
      }))
      .filter((item) => item.at !== "");
    if (logged.length) return logged;
    return [
      [
        "Requested",
        field(row, "requested_at", "requestedAt"),
        field(row, "requested_by", "requestedBy"),
      ],
      [
        "Approved",
        field(row, "approved_at", "approvedAt"),
        field(row, "approved_by", "approvedBy"),
      ],
      [
        "Rejected",
        field(row, "rejected_at", "rejectedAt"),
        field(row, "rejected_by", "rejectedBy"),
      ],
      ["Completed", field(row, "completed_at", "completedAt"), ""],
    ]
      .filter((item) => item[1] !== "")
      .map(([label, at, by]) => ({
        label: String(label),
        at,
        by: by === "" ? "" : String(by),
      }));
  }
}
