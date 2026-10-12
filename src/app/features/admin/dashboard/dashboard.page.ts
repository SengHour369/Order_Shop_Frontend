import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { MonthlyReport } from "../reports/report.models";
import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { catchError, forkJoin, Observable, of } from "rxjs";
import { FormsModule } from "@angular/forms";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import {
  AdminApi,
  field,
  InventorySummary,
  OrderSummary,
  Row,
  text,
  tone,
  usd,
  when,
} from "../api/admin.api";
@Component({
  imports: [TranslatePipe, Status, RouterLink, Icon, FormsModule],
  templateUrl: "./dashboard.html",
  styleUrl: "./dashboard.css",
})
export class AdminDashboardPage extends PageState {
  private api = inject(AdminApi);
  orders = signal<OrderSummary | null>(null);
  inventory = signal<InventorySummary | null>(null);
  customers = signal<number | null>(null);
  year = new Date().getFullYear();
  monthly = signal<MonthlyReport[]>([]);
  weekly = signal<
    { year: number; month: number; day: number; count: number }[]
  >([]);
  recent = signal<Row[]>([]);
  unavailable = signal<string[]>([]);
  currency = "";
  colors = [
    "#f5b544",
    "#69a7f8",
    "#4169ec",
    "#9868df",
    "#25bb88",
    "#ef7186",
    "#df5767",
    "#b78ddd",
  ];
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
    if (this.busy()) return;
    this.unavailable.set([]);
    this.run(
      forkJoin({
        orders: this.available(this.api.ordersSummary(), "Order summary"),
        inventory: this.available(this.api.inventorySummary(), "Inventory"),
        customers: this.available(this.api.customerCount(), "Customers"),
        recent: this.available(this.api.orders(1, "", 6), "Recent orders"),
        monthly: this.available(
          this.api.monthlyReport("sales", this.year),
          "Sales",
        ),
        weekly: this.available(
          this.api.weeklyOrders(this.today()),
          "Weekly orders",
        ),
      }),
      (result) => {
        this.orders.set(result.orders);
        this.inventory.set(result.inventory);
        this.customers.set(result.customers);
        this.monthly.set(result.monthly ?? []);
        this.currency = this.currencies()[0] || "";
        this.weekly.set(result.weekly ?? []);
        this.recent.set(result.recent?.items.slice(0, 6) ?? []);
        if (this.unavailable().length)
          this.error.set(
            `${this.unavailable().join(", ")} temporarily unavailable. Refresh to retry.`,
          );
      },
    );
  }
  private available<T>(source: Observable<T>, label: string) {
    return source.pipe(
      catchError(() => {
        this.unavailable.update((items) => [...items, label]);
        return of(null);
      }),
    );
  }
  customerName(order: Row) {
    const name = field(order, "customer_name", "customerName");
    if (name !== "") return String(name);
    const customer = order["customer"];
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
  private today() {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  }
  currencies() {
    return [
      ...new Set(this.monthly().map((row) => row.currency || "Unspecified")),
    ];
  }
  salesMonths() {
    return Array.from({ length: 12 }, (_, index) => ({
      name: new Date(this.year, index, 1).toLocaleString("en-US", {
        month: "short",
      }),
      value: this.monthly()
        .filter(
          (row) =>
            row.month === index + 1 &&
            (row.currency || "Unspecified") === this.currency,
        )
        .reduce((sum, row) => sum + Number(row.amount), 0),
    }));
  }
  salesTotal() {
    return this.salesMonths().reduce((sum, row) => sum + row.value, 0);
  }
  money(amount: number) {
    return `${this.currency || "Unspecified"} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  salesPoints() {
    const rows = this.salesMonths();
    const max = Math.max(1, ...rows.map((row) => row.value));
    return rows
      .map((row, i) => `${20 + i * 40},${175 - (row.value / max) * 150}`)
      .join(" ");
  }
  donut() {
    const total = this.bars().reduce((sum, row) => sum + row.value, 0);
    if (!total) return "#edf1f7";
    let position = 0;
    return `conic-gradient(${this.bars()
      .map((row, i) => {
        const start = position;
        position += (row.value / total) * 100;
        return `${this.colors[i]} ${start}% ${position}%`;
      })
      .join(",")})`;
  }
  weekBars() {
    const counts = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (name) => ({ name, value: 0 }),
    );
    for (const row of this.weekly()) {
      const day = new Date(row.year, row.month - 1, row.day).getDay();
      counts[(day + 6) % 7].value += row.count;
    }
    const max = Math.max(1, ...counts.map((row) => row.value));
    return counts.map((row) => ({ ...row, height: (row.value / max) * 140 }));
  }
  bars() {
    const summary = this.orders();
    if (!summary) return [];
    const rows = [
      ["Pending", summary.pending],
      ["Confirmed", summary.confirmed],
      ["Processing", summary.processing],
      ["Shipped", summary.shipped],
      ["Delivered", summary.delivered],
      ["Cancelled", summary.cancelled],
      ["Failed", summary.failed],
      ["Refunded", summary.refunded],
    ] as const;
    const max = Math.max(1, ...rows.map((row) => Number(row[1] || 0)));
    return rows.map(([name, value]) => {
      const count = Number(value || 0);
      return {
        name,
        value: count,
        height: count === 0 ? 4 : Math.max(8, Math.round((count / max) * 140)),
      };
    });
  }
}
