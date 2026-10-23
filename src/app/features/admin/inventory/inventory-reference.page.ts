import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject, input, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import {
  catchError,
  concatMap,
  forkJoin,
  from,
  map,
  of,
  switchMap,
  tap,
  toArray,
} from "rxjs";
import { PageState } from "../../../shared/utils/page-state";
import { Status } from "../../../shared/components/status";
import { Icon } from "../../../shared/components/icon";
import {
  AdminApi,
  InventorySummary,
  Row,
  field,
  text,
  when,
} from "../api/admin.api";
import {
  StockAction,
  StockLine,
  stockAfter,
  stockQuantity,
  validateStockLine,
} from "./stock-workflow";

@Component({
  selector: "app-admin-inventory",
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, FormsModule, RouterLink, Status, Icon],
  templateUrl: "./inventory-reference.html",
  styleUrls: ["../styles/reference.css", "../styles/operations.css"],
})
export class InventoryReferencePage extends PageState {
  embedded = input(false);
  initialStockStatus = input("");
  private api = inject(AdminApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  action: StockAction | null = null;
  rows = signal<Row[]>([]);
  summary = signal<InventorySummary | null>(null);
  page = 1;
  size = 10;
  pages = 1;
  total = 0;
  search = "";
  warehouse = "";
  status = "";
  step = 1;
  lines: StockLine[] = [];
  reference = "";
  date = new Date().toISOString().slice(0, 16);
  reason = "";
  notes = "";
  picker = false;
  field = field;
  text = text;
  when = when;
  stock = stockQuantity;
  ngOnInit() {
    const path = this.embedded() ? "" : this.router.url.split("?")[0];
    if (this.embedded()) this.status = this.initialStockStatus();
    this.action = path.endsWith("/stock-in")
      ? "in"
      : path.endsWith("/stock-out")
        ? "out"
        : path.endsWith("/adjustments")
          ? "adjust"
          : null;
    this.regenerate();
    this.load();
    const id = Number(this.route.snapshot.queryParamMap.get("id"));
    if (this.action && id > 0) {
      this.api
        .inventoryItem(id)
        .subscribe({
          next: (row) => this.add(row),
          error: () =>
            this.error.set("The selected inventory item could not be loaded."),
        });
    }
  }
  title() {
    return this.action === "in"
      ? "Stock In"
      : this.action === "out"
        ? "Stock Out"
        : this.action === "adjust"
          ? "Adjustments"
          : "Inventory";
  }
  regenerate() {
    this.reference = `${this.action === "in" ? "SI" : this.action === "out" ? "SO" : "ADJ"}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
  }
  load() {
    this.run(
      forkJoin({
        list: this.api.searchInventory(
          this.search,
          this.warehouse,
          this.status,
          this.page,
          this.size,
        ),
        summary: this.api.inventorySummary(),
      }),
      (result) => {
        this.rows.set(result.list.items);
        this.pages = result.list.pages;
        this.total = result.list.total;
        this.summary.set(result.summary);
      },
    );
  }
  filter(status?: string) {
    if (status !== undefined) this.status = status;
    this.page = 1;
    this.load();
  }
  reset() {
    this.search = this.warehouse = this.status = "";
    this.filter();
  }
  go(delta: number) {
    this.page = Math.max(1, Math.min(this.pages, this.page + delta));
    this.load();
  }
  add(row: Row) {
    if (this.lines.some((line) => line.row["id"] === row["id"])) return;
    this.lines = [
      ...this.lines,
      { row, quantity: 1, before: stockQuantity(row), saved: false },
    ];
  }
  remove(index: number) {
    if (!this.lines[index].saved)
      this.lines = this.lines.filter((_, i) => i !== index);
  }
  contains(row: Row) {
    return this.lines.some((line) => line.row["id"] === row["id"]);
  }
  after(line: StockLine) {
    return (
      line.after ??
      stockAfter(this.action || "adjust", line.before, line.quantity)
    );
  }
  totalQuantity() {
    return this.lines.reduce((sum, line) => sum + line.quantity, 0);
  }
  next() {
    this.error.set("");
    if (
      this.step === 1 &&
      (!this.reference.trim() || !this.date || !this.reason.trim())
    ) {
      this.error.set("Reference, date and reason are required.");
      return;
    }
    if (this.step === 2) {
      if (!this.lines.length) {
        this.error.set("Select at least one product.");
        return;
      }
      const invalid = this.lines
        .map((line) => validateStockLine(this.action!, line))
        .find(Boolean);
      if (invalid) {
        this.error.set(invalid);
        return;
      }
    }
    this.step = Math.min(3, this.step + 1);
  }
  refreshLines() {
    const pending = this.lines.filter((line) => !line.saved);
    if (!pending.length) return;
    this.run(
      forkJoin(
        pending.map((line) => this.api.inventoryItem(Number(line.row["id"]))),
      ),
      (rows) => {
        rows.forEach((row, i) => {
          pending[i].row = row;
          pending[i].before = stockQuantity(row);
        });
        this.message.set(
          "Current quantities refreshed. Review the updated stock before confirming.",
        );
      },
    );
  }
  confirm() {
    if (this.busy() || this.step !== 3 || !this.action || !this.lines.length)
      return;
    const action = this.action;
    const pending = this.lines.filter((line) => !line.saved);
    this.run(
      from(pending).pipe(
        concatMap((line) =>
          this.api.inventoryItem(Number(line.row["id"])).pipe(
            switchMap((current) => {
              const invalid = validateStockLine(action, line, current);
              if (invalid) throw new Error(invalid);
              line.before = stockQuantity(current);
              return action === "in"
                ? this.api.restock(Number(current["id"]), line.quantity)
                : this.api.adjustInventory(
                    Number(current["id"]),
                    stockAfter(action, line.before, line.quantity),
                    String(current["warehouse_location"] || ""),
                    Number(current["low_stock_threshold"] ?? 5),
                  );
            }),
            tap((result) => {
              line.after = stockQuantity(result);
              line.saved = true;
            }),
          ),
        ),
        toArray(),
      ),
      () => {
        this.step = 4;
        this.message.set("All selected stock quantities were updated.");
      },
    );
  }
  startAgain() {
    this.lines = [];
    this.step = 1;
    this.notes = this.reason = "";
    this.regenerate();
    this.load();
  }
  export() {
    const rows = this.rows().map((row) => [
      row["product_name"],
      row["sku"],
      row["warehouse_location"],
      row["stock_qty"],
      row["reserved_qty"],
      row["available_qty"],
    ]);
    const csv = [
      ["Product", "SKU", "Warehouse", "Stock", "Reserved", "Available"],
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "inventory-page.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  print() {
    window.print();
  }
}
