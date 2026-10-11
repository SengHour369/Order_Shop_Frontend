import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { AdminApi } from "./admin.api";
import { MonthlyReport } from "./report.models";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
@Component({
  imports: [FormsModule, Status],
  template: `
    <section>
      <div class="adm-page-head">
        <div>
          <h2>{{ heading }}</h2>
          <p>{{ description }}</p>
        </div>
        @if (kind !== "tax") {
          <form class="adm-actions" (ngSubmit)="load()">
            <label
              >Year
              <input
                name="year"
                type="number"
                min="2000"
                max="2100"
                [(ngModel)]="year"
                required
            /></label>
            <button class="adm-btn adm-primary" [disabled]="busy()">
              Apply
            </button>
            <button
              class="adm-btn"
              type="button"
              [disabled]="busy() || !rows().length"
              (click)="download()"
            >
              Export CSV
            </button>
          </form>
        }
      </div>
      <app-status [busy]="busy()" [error]="error()" />
      @if (kind === "tax") {
        <article class="adm-panel">
          <div class="adm-empty">
            <strong>Tax reporting needs recorded tax amounts</strong>
            <p>
              Orders do not currently store tax amounts or tax rates. A
              historical tax report cannot be calculated reliably from order
              totals.
            </p>
          </div>
        </article>
      } @else {
        <div class="adm-stats report-summary">
          <article class="adm-card stat">
            <span class="k">{{
              kind === "payment" ? "Completed Payments" : "Orders"
            }}</span>
            <strong>{{ recordCount() }}</strong>
            <em>Selected year · {{ loadedYear() }}</em>
          </article>
          @for (summary of currencySummaries(); track summary.currency) {
            <article class="adm-card stat">
              <span class="k"
                >Total · {{ summary.currency || "Unspecified" }}</span
              >
              <strong>{{ money(summary) }}</strong>
              <em>{{ summary.count }} records</em>
            </article>
          }
        </div>
        <article class="adm-panel">
          <h3>{{ loadedYear() }} monthly totals</h3>
          <p>
            Totals include every matching record for the selected year. Payment
            currencies are reported separately.
          </p>
          <div class="adm-chart">
            @for (row of rows(); track row.month + ":" + row.currency) {
              <span [title]="money(row)"
                ><i [style.height.%]="height(row)"></i>{{ month(row.month) }}
                {{ row.currency || "Unspecified" }}</span
              >
            }
          </div>
          <div class="adm-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Currency</th>
                  <th>Count</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.month + ":" + row.currency) {
                  <tr>
                    <td>{{ month(row.month) }}</td>
                    <td>{{ row.currency || "Unspecified" }}</td>
                    <td>{{ row.count }}</td>
                    <td>{{ money(row) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4">
                      <div class="adm-empty">
                        No matching records for this year.
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `,
})
export class ReportsPage extends PageState {
  private api = inject(AdminApi);
  kind = String(inject(ActivatedRoute).snapshot.data["report"] || "sales");
  year = new Date().getFullYear();
  loadedYear = signal(this.year);
  rows = signal<MonthlyReport[]>([]);
  heading =
    this.kind === "payment"
      ? "Payment Report"
      : this.kind === "tax"
        ? "Tax Report"
        : "Sales Report";
  description =
    this.kind === "payment"
      ? "Completed payments by payment date."
      : "Order value by order date, excluding cancelled, failed, refunded and unfinished checkouts.";
  constructor() {
    super();
    if (this.kind !== "tax") this.load();
  }
  load() {
    if (!Number.isInteger(this.year) || this.year < 2000 || this.year > 2100) {
      this.error.set("Choose a year between 2000 and 2100.");
      return;
    }
    const year = this.year;
    this.rows.set([]);
    this.run(this.api.monthlyReport(this.kind, year), (rows) => {
      this.loadedYear.set(year);
      this.rows.set(rows);
    });
  }
  recordCount() {
    return this.rows().reduce((total, row) => total + row.count, 0);
  }
  currencySummaries() {
    return [...new Set(this.rows().map((row) => row.currency))].map(
      (currency) => {
        const rows = this.rows().filter((row) => row.currency === currency);
        return {
          month: 0,
          currency,
          count: rows.reduce((total, row) => total + row.count, 0),
          amount: rows.reduce((total, row) => total + Number(row.amount), 0),
        };
      },
    );
  }
  month(value: number) {
    return MONTHS[value - 1] || String(value);
  }
  money(row: MonthlyReport) {
    const value = Number(row.amount);
    return `${row.currency || "Unspecified"} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  height(row: MonthlyReport) {
    const max = Math.max(
      1,
      ...this.rows()
        .filter((item) => item.currency === row.currency)
        .map((item) => Number(item.amount)),
    );
    return Math.max(0, (Number(row.amount) / max) * 100);
  }
  download() {
    const lines = [
      "Year,Month,Currency,Count,Amount",
      ...this.rows().map((row) =>
        [
          this.loadedYear(),
          row.month,
          /^[A-Z]{3}$/.test(row.currency || "") ? row.currency : "Unspecified",
          row.count,
          row.amount,
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${this.kind}-${this.loadedYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
