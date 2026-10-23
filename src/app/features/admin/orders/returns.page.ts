import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { ProductImage } from "../../../shared/components/product-image";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { catchError, forkJoin, of, switchMap, map } from "rxjs";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text, tone, usd, when } from "../api/admin.api";
import { related } from "../payments/refunds.page";
const returnStatuses = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "INSPECTING",
  "COMPLETED",
];
@Component({
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, Status, RouterLink, FormsModule, Icon],
  templateUrl: "./returns-list.html",
  styleUrls: ["../styles/reference.css", "./returns-list.css"],
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
      { label: "Total Returns", value: field(s,"total_returns"), icon: "box", tone: "blue" },
      { label: "Processed Returns", value: field(s,"processed_returns"), icon: "check", tone: "green" },
      { label: "Pending Returns", value: field(s,"pending_returns"), icon: "clock", tone: "amber" },
      { label: "Return Rate", value: field(s,"return_rate") !== "" ? field(s,"return_rate") + "%" : "—", icon: "chart", tone: "violet" },
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
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, Status, RouterLink, FormsModule],
  templateUrl: "./return-detail.html",
  styleUrl: "./return-detail.css",
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
  steps = ["REQUESTED", "APPROVED", "RECEIVED", "INSPECTING", "COMPLETED"];
  stepIndex(row: Row) { return this.steps.indexOf(this.statusOf(row)); }
  act(action: string, passed?: boolean) {
    if (this.busy()) return;
    const allowed: Record<string,string[]> = { REQUESTED: ["approve", "reject"], APPROVED: ["receive"], RECEIVED: ["inspect/start"], INSPECTING: ["inspect/complete"] };
    if (!(allowed[this.statusOf(this.row() || {})] || []).includes(action)) {
      this.error.set("This action is not allowed for the current return status."); return;
    }
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
        this.api.returnHistory(this.id).subscribe({next: history => this.history.set(history), error: () => this.error.set("Return updated, but history could not be refreshed.")});
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
