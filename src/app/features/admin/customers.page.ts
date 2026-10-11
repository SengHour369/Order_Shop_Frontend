import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PageState } from "../../shared/page-state";
import { Icon } from "../../shared/icon";
import { Status } from "../../shared/status";
import { AdminApi, field, Row, text, tone, when } from "./admin.api";
@Component({
  imports: [Status, RouterLink, FormsModule, Icon],
  templateUrl: "./customers-reference.html",
  styleUrls: ["./reference.css", "./operations.css"],
})
export class CustomersPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  selected = signal<Row | null>(null);
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
  when = when;
  field = field;
  text = text;
  tone = tone;
  constructor() {
    super();
    this.route.queryParamMap.subscribe((params) =>
      this.query.set(params.get("q") || ""),
    );
    this.load();
  }
  load(done?: string) {
    this.run(this.api.customers(), (result) => {
      this.rows.set(result.items);
      const selectedId = this.selected()?.["id"];
      if (selectedId !== undefined) {
        this.selected.set(
          result.items.find((row) => row["id"] === selectedId) || null,
        );
      }
      if (done) this.message.set(done);
    });
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
  set(row: Row, status: string) {
    if (
      status === "BLK" &&
      !confirm("Block this account? They will not be able to sign in.")
    )
      return;
    this.run(this.api.customerStatus(Number(field(row, "id")), status), () => {
      this.load(
        status === "ACT" ? "Account is active." : "Account is blocked.",
      );
    });
  }
}
@Component({
  imports: [Status, RouterLink],
  template: `<section>
    <div class="adm-page-head">
      <div>
        <h2>Customer detail</h2>
        <p><a routerLink="/admin/customers">Back to customers</a></p>
      </div>
    </div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (row(); as current) {
      <article class="adm-panel">
        <div class="adm-who">
          <span class="adm-dot">{{
            text(field(current, "username")).slice(0, 1)
          }}</span>
          <div>
            <b>{{ text(field(current, "username")) }}</b>
            <small>{{ text(field(current, "email")) }}</small>
          </div>
        </div>
        <p>
          <span
            class="adm-badge"
            [class.on]="tone(field(current, 'status')) === 'on'"
            [class.off]="tone(field(current, 'status')) === 'off'"
            [class.wait]="tone(field(current, 'status')) === 'wait'"
            >{{ text(field(current, "status")) }}</span
          >
        </p>
        <div class="adm-kv">
          <span>Username</span
          ><strong>{{ text(field(current, "username")) }}</strong>
          <span>Name</span
          ><strong>{{ text(field(current, "fullName", "full_name")) }}</strong>
          <span>Email</span><strong>{{ text(field(current, "email")) }}</strong>
          <span>Phone</span><strong>{{ text(field(current, "phone")) }}</strong>
          <span>Birthdate</span
          ><strong>{{ text(field(current, "birthdate")) }}</strong>
          <span>Joined</span
          ><strong>{{
            when(field(current, "createdAt", "created_at"))
          }}</strong>
          <span>Status</span
          ><strong>{{ text(field(current, "status")) }}</strong>
        </div>
        <div class="adm-actions" style="margin-top:16px">
          <button
            class="adm-btn adm-primary"
            type="button"
            [disabled]="busy()"
            (click)="setStatus('ACT')"
          >
            Mark active
          </button>
          <button
            class="adm-btn danger"
            type="button"
            [disabled]="busy()"
            (click)="setStatus('BLK')"
          >
            Block
          </button>
          <a
            class="adm-btn"
            [routerLink]="['/admin/payments']"
            [queryParams]="{ user: field(current, 'id') }"
            >Payment history</a
          >
          <a
            class="adm-btn"
            [routerLink]="['/admin/transactions']"
            [queryParams]="{ customer: field(current, 'id') }"
            >Transactions</a
          >
        </div>
      </article>
    }
  </section>`,
})
export class CustomerDetailPage extends PageState {
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
    this.run(this.api.customer(id), (row) => {
      this.row.set(row);
      if (done) this.message.set(done);
    });
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
