import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subscription } from "rxjs";
import { Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text, tone, usd, when } from "../api/admin.api";
@Component({
  imports: [TranslatePipe, Status, RouterLink, FormsModule, Icon],
  templateUrl: "./customers-reference.html",
  styleUrls: ["../styles/reference.css", "../styles/operations.css"],
})
export class CustomersPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  page = 1;
  rows = signal<Row[]>([]);
  query = signal("");
  visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.rows().filter(
      (row) =>
        !q ||
        `${field(row, "username")} ${field(row, "email")} ${field(row, "phone")}`
          .toLowerCase()
          .includes(q),
    );
  });
  totalCount = computed(() => this.rows().length);
  activeCount = computed(
    () => this.rows().filter((row) => this.active(row)).length,
  );
  blockedCount = computed(
    () => this.rows().filter((row) => this.blocked(row)).length,
  );
  field = field;
  text = text;
  constructor() {
    super();
    this.route.queryParamMap.subscribe((params) =>
      this.query.set(params.get("q") || ""),
    );
    this.load();
  }
  load() {
    this.run(this.api.customers(), (result) => {
      this.rows.set(result.items);
    }, true);
  }
  initial(row: Row) {
    const value = String(field(row, "username") || "?").trim();
    return (value || "?").slice(0, 1).toUpperCase();
  }
  active(row: Row) {
    const status = String(field(row, "status") ?? "").toUpperCase();
    return status === "ACT" || tone(field(row, "status")) === "on";
  }
  blocked(row: Row) {
    const status = String(field(row, "status") ?? "").toUpperCase();
    return status === "BLK" || tone(field(row, "status")) === "off";
  }

}
@Component({
  imports: [TranslatePipe, Status, RouterLink, Icon],
  templateUrl: "./customer-detail.html",
  styleUrl: "../styles/details.css",
})
export class CustomerDetailPage extends PageState {
  private historyDestroyRef = inject(DestroyRef);
  private historyRequest?: Subscription;
  orders = signal<Row[]>([]);
  ordersError = signal('');
  ordersBusy = signal(false);
  orderPage = 1;
  orderPages = signal(1);
  orderTotal = signal<number | null>(null);
  usd = usd;
  customerName(row: Row) { return text(field(row, 'fullName', 'full_name', 'name', 'username')); }
  loadOrders(id: number, page = 1) {
    this.ordersBusy.set(true);
    this.ordersError.set('');
    this.historyRequest?.unsubscribe();
    this.historyRequest = this.api.customerOrders(id, page).pipe(takeUntilDestroyed(this.historyDestroyRef)).subscribe({
      next: result => {
        this.orders.set(result.items);
        this.orderPage = page;
        this.orderPages.set(result.pages);
        this.orderTotal.set(result.total);
        this.ordersBusy.set(false);
      },
      error: () => { this.orders.set([]); this.orderTotal.set(null); this.ordersBusy.set(false); this.ordersError.set('Could not load order history.'); }
    });
  }

  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  row = signal<Row | null>(null);
  field = field;
  text = text;
  when = when;
  tone = tone;
  constructor() {
    super();
    this.route.paramMap.subscribe((params) =>
      this.load(Number(params.get("id"))),
    );
  }
  load(id: number, done?: string) {
    this.historyRequest?.unsubscribe();
    this.row.set(null);
    this.orders.set([]);
    this.orderTotal.set(null);
    this.run(this.api.customer(id), (row) => {
      this.row.set(row);
      this.loadOrders(id);
      if (done) this.message.set(done);
    }, true);
  }
  setStatus(status: string) {
    if (
      status === "BLK" &&
      !confirm("Block this account? They will not be able to sign in.")
    )
      return;
    const id = Number(field(this.row() || {}, "id"));
    this.run(this.api.customerStatus(id, status), () => {
      this.load(
        id,
        status === "ACT" ? "Account is active." : "Account is blocked.",
      );
    });
  }
}
