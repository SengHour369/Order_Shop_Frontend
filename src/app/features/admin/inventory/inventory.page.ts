import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";
import { PageState } from "../../../shared/utils/page-state";
import { Status } from "../../../shared/components/status";
import { Icon } from "../../../shared/components/icon";
import {
  AdminApi,
  field,
  InventorySummary,
  Row,
  text,
  tone,
  when,
} from "../api/admin.api";
@Component({
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, Status, FormsModule, Icon, RouterLink],
  template: `@if (accessDenied()) { <app-page-access-denied /> } @else { <section>
    @if (screen() === "list") {
      <div class="adm-page-head">
        <div>
          <h2>{{ "Inventory" | translate }}</h2>
          <p>Manage stock levels and product availability.</p>
        </div>
        <div class="adm-head-actions">
          <a class="adm-btn adm-primary" routerLink="/admin/inventory/add"
             *appCanRoute="'/admin/inventory/add'"><app-icon name="plus" /> Add inventory</a
          >
        </div>
      </div>
      <div class="adm-stats" style="margin-bottom:14px">
        <article class="adm-card stat">
          <span class="adm-ico grad-blue"><app-icon name="box" /></span
          ><span class="k">{{ "Products" | translate }}</span
          ><strong>{{ summary()?.total_products ?? "—" }}</strong>
        </article>
        <article class="adm-card stat">
          <span class="adm-ico grad-green"><app-icon name="list" /></span
          ><span class="k">Total stock</span
          ><strong>{{ summary()?.total_stock ?? "—" }}</strong>
        </article>
        <article class="adm-card stat">
          <span class="adm-ico grad-amber"><app-icon name="clock" /></span
          ><span class="k">{{ "Low stock" | translate }}</span
          ><strong>{{ summary()?.low_stock ?? "—" }}</strong>
        </article>
        <article class="adm-card stat">
          <span class="adm-ico grad-red"><app-icon name="close" /></span
          ><span class="k">{{ "Out of stock" | translate }}</span
          ><strong>{{ summary()?.out_of_stock ?? "—" }}</strong>
        </article>
      </div>
    }
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (screen() === "form" && composer(); as kind) {
      <div class="adm-work" style="margin-bottom:14px">
        <form class="adm-form adm-panel" (ngSubmit)="submit(kind)" *appCan="'INVENTORY_ADJUST'">
          <div class="adm-section-title">
            <div>
              <h3>
                {{
                  kind === "create"
                    ? "Add Inventory"
                    : kind === "restock"
                      ? "Edit Inventory (Restock)"
                      : "Set quantity"
                }}
              </h3>
              <p>
                Dashboard › Inventory ›
                {{
                  kind === "create"
                    ? "Add Inventory"
                    : kind === "restock"
                      ? "Edit Inventory"
                      : "Set quantity"
                }}
              </p>
            </div>
          </div>
          <div class="adm-section-title"><h3>Product Information</h3></div>
          @if (kind === "create") {
            <label
              >Product SKU id<input
                name="sku"
                type="number"
                [(ngModel)]="skuId"
                required
            /></label>
          } @else {
            <div class="adm-kv">
              <span>{{ "Product" | translate }}</span>
              <div>{{ text(field(selectedRow() || {}, "product_name")) }}</div>
              <span>SKU</span>
              <div>{{ text(field(selectedRow() || {}, "sku")) }}</div>
              <span>SKU id</span>
              <div>
                {{ text(field(selectedRow() || {}, "product_sku_id")) }}
              </div>
              <span>{{ "Current stock" | translate }}</span>
              <div>
                {{
                  text(field(selectedRow() || {}, "stock_qty", "available_qty"))
                }}
              </div>
            </div>
          }
          <div class="adm-section-title">
            <h3>
              {{ kind === "create" ? "Inventory Details" : "Edit Details" }}
            </h3>
          </div>
          @if (kind === "restock") {
            <label
              >Add quantity<input
                name="quantity"
                type="number"
                min="1"
                [(ngModel)]="quantity"
                required
            /></label>
          } @else {
            <label
              >{{ "Quantity" | translate }}<input
                name="quantity"
                type="number"
                min="0"
                [(ngModel)]="quantity"
                required
            /></label>
            <label
              >{{ "Warehouse" | translate }}<input name="warehouse" [(ngModel)]="warehouse"
            /></label>
          }
          <div class="adm-actions">
            <button class="adm-btn adm-primary" [disabled]="busy()">
              {{
                kind === "restock"
                  ? "Confirm restock"
                  : kind === "create"
                    ? "Save inventory"
                    : "Save quantity"
              }}
            </button>
            <a class="adm-btn" routerLink="/admin/inventory" *appCanRoute="'/admin/inventory'">{{ "Cancel" | translate }}</a>
          </div>
        </form>
        <aside class="adm-panel adm-preview">
          <h3>{{ "Summary" | translate }}</h3>
          @if (kind === "create") {
            <p>New stock record for SKU {{ skuId || "—" }}</p>
          } @else {
            <p>{{ text(field(selectedRow() || {}, "product_name")) }}</p>
          }
          <p>Quantity {{ quantity }}</p>
          @if (kind !== "restock") {
            <p>Warehouse {{ warehouse || "—" }}</p>
          }
        </aside>
      </div>
    }
    @if (screen() === "list") {
      <div class="adm-table-card">
        <form class="adm-toolbar" (ngSubmit)="applySearch()">
          <input
            name="q"
            [(ngModel)]="search"
            placeholder="Search product, SKU, or warehouse"
          />
          <button class="adm-btn" type="submit" [disabled]="busy()">
            {{ "Search" | translate }}
          </button>
          <button
            class="adm-btn"
            type="button"
            [class.adm-primary]="mode === 'all' && !search"
            (click)="setMode('all')"
          >
            All stock
          </button>
          <button
            class="adm-btn"
            type="button"
            [class.adm-primary]="mode === 'low' && !search"
            (click)="setMode('low')"
          >
            {{ "Low stock" | translate }}
          </button>
        </form>
        <div class="adm-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product / SKU</th>
                <th>{{ "Warehouse" | translate }}</th>
                <th>Stock qty</th>
                <th>Reserved qty</th>
                <th>Available qty</th>
                <th>Low stock threshold</th>
                <th>{{ "Status" | translate }}</th>
                <th>{{ "Last updated" | translate }}</th>
                <th>{{ "Action" | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track field(row, "id")) {
                <tr>
                  <td>
                    <span class="adm-who">
                      <span>
                        <b>{{ text(field(row, "product_name", "name")) }}</b>
                        <small>{{ text(field(row, "sku", "sku_code")) }}</small>
                      </span>
                    </span>
                  </td>
                  <td>{{ text(field(row, "warehouse_location")) }}</td>
                  <td>{{ text(field(row, "stock_qty", "quantity")) }}</td>
                  <td>{{ text(field(row, "reserved_qty")) }}</td>
                  <td>{{ text(field(row, "available_qty")) }}</td>
                  <td>{{ text(field(row, "low_stock_threshold")) }}</td>
                  <td>
                    <span
                      class="adm-badge"
                      [class.on]="tone(field(row, 'stock_status')) === 'on'"
                      [class.off]="tone(field(row, 'stock_status')) === 'off'"
                      [class.wait]="tone(field(row, 'stock_status')) === 'wait'"
                      >{{ text(field(row, "stock_status")) }}</span
                    >
                  </td>
                  <td>
                    {{
                      when(
                        field(
                          row,
                          "updated_at",
                          "updatedAt",
                          "last_restocked_at"
                        )
                      )
                    }}
                  </td>
                  <td class="adm-actions">
                    <a
                      class="adm-btn icon"
                      [routerLink]="['/admin/inventory/details']"
                      [queryParams]="{ id: field(row, 'id') }"
                      aria-label="View inventory"
                       *appCanRoute="['/admin/inventory/details']"><app-icon name="eye"
                    /></a>
                    <a
                      class="adm-btn"
                      [routerLink]="['/admin/inventory/edit']"
                      [queryParams]="{ id: field(row, 'id'), mode: 'adjust' }"
                       *appCanRoute="['/admin/inventory/edit']">Set quantity</a
                    >
                    <a
                      class="adm-btn"
                      [routerLink]="['/admin/inventory/edit']"
                      [queryParams]="{ id: field(row, 'id') }"
                       *appCanRoute="['/admin/inventory/edit']">Restock</a
                    >
                    <button
                      class="adm-btn icon danger"
                      type="button"
                      aria-label="Delete inventory"
                      [disabled]="busy()"
                      (click)="remove(row)"
                     *appCan="'INVENTORY_ADJUST'">
                      <app-icon name="trash" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9">
                    <div class="adm-empty">
                      <strong>No inventory records</strong>
                      <p>No inventory records on this page.</p>
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
              name="size"
              aria-label="Rows per page"
            >
              @for (option of sizes; track option) {
                <option [ngValue]="option">{{ option }} / page</option>
              }
            </select>
          </span>
        </div>
      </div>
    }
    @if (screen() === "detail" && viewing(); as current) {
      <div class="adm-stack">
        <div class="adm-page-head">
          <div>
            <h2>Inventory Details</h2>
            <p>Dashboard › Inventory › Details</p>
          </div>
          <a class="adm-btn" routerLink="/admin/inventory" *appCanRoute="'/admin/inventory'">{{ "Back" | translate }}</a>
        </div>
        <article class="adm-panel">
          <div class="adm-section-title">
            <h3>{{ text(field(current, "product_name", "name")) }}</h3>
            <span
              class="adm-badge"
              [class.on]="tone(field(current, 'stock_status')) === 'on'"
              [class.off]="tone(field(current, 'stock_status')) === 'off'"
              [class.wait]="tone(field(current, 'stock_status')) === 'wait'"
              >{{ text(field(current, "stock_status")) }}</span
            >
          </div>
          <div class="adm-kv">
            <span>SKU</span>
            <div>{{ text(field(current, "sku", "sku_code")) }}</div>
            <span>SKU id</span>
            <div>{{ text(field(current, "product_sku_id")) }}</div>
            <span>{{ "Warehouse" | translate }}</span>
            <div>{{ text(field(current, "warehouse_location")) }}</div>
            <span>Stock qty</span>
            <div>{{ text(field(current, "stock_qty", "quantity")) }}</div>
            <span>Reserved qty</span>
            <div>{{ text(field(current, "reserved_qty")) }}</div>
            <span>Available qty</span>
            <div>{{ text(field(current, "available_qty")) }}</div>
            <span>Low stock threshold</span>
            <div>{{ text(field(current, "low_stock_threshold")) }}</div>
            <span>Last restocked</span>
            <div>{{ when(field(current, "last_restocked_at")) }}</div>
            <span>Created</span>
            <div>{{ when(field(current, "created_at", "createdAt")) }}</div>
            <span>Updated</span>
            <div>{{ when(field(current, "updated_at", "updatedAt")) }}</div>
          </div>
          @if (history().length) {
            <h3>Movement history</h3>
            <div class="adm-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Change</th>
                    <th>{{ "Quantity" | translate }}</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  @for (
                    item of history();
                    track field(item, "id", "created_at", "createdAt")
                  ) {
                    <tr>
                      <td>
                        {{
                          text(field(item, "movement_type", "type", "reason"))
                        }}
                      </td>
                      <td>
                        {{
                          text(
                            field(item, "quantity", "change_qty", "stock_qty")
                          )
                        }}
                      </td>
                      <td>
                        {{ when(field(item, "created_at", "createdAt")) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <div class="adm-actions">
            <a
              class="adm-btn adm-primary"
              [routerLink]="['/admin/inventory/edit']"
              [queryParams]="{ id: field(current, 'id'), mode: 'adjust' }"
               *appCanRoute="['/admin/inventory/edit']">Set quantity</a
            >
            <a
              class="adm-btn"
              [routerLink]="['/admin/inventory/edit']"
              [queryParams]="{ id: field(current, 'id') }"
               *appCanRoute="['/admin/inventory/edit']">Restock</a
            >
          </div>
        </article>
      </div>
    }
    @if (screen() !== "list" && !composer() && !viewing()) {
      <a class="adm-btn" routerLink="/admin/inventory" *appCanRoute="'/admin/inventory'">Back to inventory</a>
    }
  </section> }`,
})
export class InventoryPage extends PageState {
  private api = inject(AdminApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  screen = signal<"list" | "form" | "detail">("list");
  rows = signal<Row[]>([]);
  summary = signal<InventorySummary | null>(null);
  pages = signal(1);
  total = signal(0);
  page = 1;
  size = 10;
  sizes = [10, 20, 50];
  mode: "all" | "low" = "all";
  search = "";
  history = signal<Row[]>([]);
  composer = signal<"create" | "adjust" | "restock" | null>(null);
  viewing = signal<Row | null>(null);
  selectedRow = signal<Row | null>(null);
  selected = 0;
  skuId = 0;
  quantity = 1;
  warehouse = "";
  field = field;
  text = text;
  tone = tone;
  when = when;
  constructor() {
    super();
    const url = this.router.url.split("?")[0];
    const id = Number(this.route.snapshot.queryParamMap.get("id") || 0);
    const adjust = this.route.snapshot.queryParamMap.get("mode") === "adjust";
    if (url.endsWith("/add")) {
      this.screen.set("form");
      this.openCreate();
      return;
    }
    if (url.endsWith("/edit") || url.endsWith("/details")) {
      const detail = url.endsWith("/details");
      this.screen.set(detail ? "detail" : "form");
      if (!id) {
        this.error.set("Open this page from an inventory row.");
        return;
      }
      if (detail) {
        this.run(
          forkJoin({
            row: this.api.inventoryItem(id),
            history: this.api
              .inventoryHistory(id)
              .pipe(
                catchError(() =>
                  of({ items: [] as Row[], total: 0, pages: 1, page: 1 }),
                ),
              ),
          }),
          (loaded) => {
            this.viewing.set(loaded.row);
            this.history.set(loaded.history.items);
          },
        );
        return;
      }
      this.run(this.api.inventoryItem(id), (row) =>
        this.begin(adjust ? "adjust" : "restock", row),
      );
      return;
    }
    this.load();
  }
  load() {
    const list = this.search.trim()
      ? this.api.searchInventory(this.search, "", "", this.page, this.size)
      : this.mode === "low"
        ? this.api.lowStock(this.page, this.size)
        : this.api.inventory(this.page, this.size);
    this.run(
      forkJoin({ list, summary: this.api.inventorySummary() }),
      (result) => {
        this.rows.set(result.list.items);
        this.pages.set(result.list.pages);
        this.total.set(result.list.total);
        this.summary.set(result.summary);
      },
    );
  }
  setMode(mode: "all" | "low") {
    this.search = "";
    if (this.mode === mode) {
      this.page = 1;
      this.load();
      return;
    }
    this.mode = mode;
    this.page = 1;
    this.load();
  }
  applySearch() {
    this.page = 1;
    this.load();
  }
  remove(row: Row) {
    if (!confirm("Delete this inventory record?")) return;
    this.run(this.api.deleteInventory(Number(field(row, "id"))), () =>
      this.load(),
    );
  }
  openCreate() {
    this.viewing.set(null);
    this.selected = 0;
    this.selectedRow.set(null);
    this.skuId = 0;
    this.quantity = 1;
    this.warehouse = "";
    this.composer.set("create");
  }
  begin(kind: "adjust" | "restock", row: Row) {
    this.viewing.set(null);
    this.selected = Number(field(row, "id"));
    this.selectedRow.set(row);
    this.quantity = kind === "restock" ? 1 : Number(row["stock_qty"] ?? 0);
    this.warehouse = String(field(row, "warehouse_location") || "");
    this.composer.set(kind);
  }
  submit(kind: "create" | "adjust" | "restock") {
    if (kind !== "create" && !this.selected) return;
    const done = () => {
      this.composer.set(null);
      void this.router.navigate(["/admin/inventory"]);
    };
    if (kind === "create")
      this.run(
        this.api.createInventory(this.skuId, this.quantity, this.warehouse),
        done,
      );
    else if (kind === "adjust")
      this.run(
        this.api.adjustInventory(this.selected, this.quantity, this.warehouse),
        done,
      );
    else this.run(this.api.restock(this.selected, this.quantity), done);
  }
  range() {
    if (!this.total() || !this.rows().length) return "Showing 0 results";
    const start = (this.page - 1) * this.size + 1;
    const end = start + this.rows().length - 1;
    return `Showing ${start} to ${end} of ${this.total()} results`;
  }
  pageList() {
    const last = this.pages();
    const end = Math.min(last, Math.max(1, this.page - 2) + 4);
    const numbers = [];
    for (let n = Math.max(1, end - 4); n <= end; n++) numbers.push(n);
    return numbers;
  }
  goto(page: number) {
    this.page = page;
    this.load();
  }
  setSize(size: number) {
    this.size = Number(size);
    this.page = 1;
    this.load();
  }
}
