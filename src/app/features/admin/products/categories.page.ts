import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { CatalogDetail } from "./catalog-detail";
import { ProductImage } from "../../../shared/components/product-image";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text } from "../api/admin.api";
function dated(value: unknown) {
  if (value == null || value === "") return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
@Component({
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, CatalogDetail, Status, FormsModule, Icon, RouterLink, ProductImage],
  template: `@if (accessDenied()) { <app-page-access-denied /> } @else { <section>
    @if (screen() === "list") {
      <div class="adm-page-head">
        <div>
          <h2>{{ "Categories" | translate }}</h2>
          <p>Dashboard › Categories</p>
        </div>
        <div class="adm-head-actions">
          <button
            class="adm-btn"
            type="button"
            (click)="exportRows()"
            [disabled]="!visible().length"
          >
            <app-icon name="down" /> {{ "Export" | translate }}
          </button>
          <a class="adm-btn adm-primary" routerLink="/admin/categories/add"
             *appCanRoute="'/admin/categories/add'"><app-icon name="plus" /> {{ "Add category" | translate }}</a
          >
        </div>
      </div>
      <div class="adm-stats" style="margin-bottom:14px">
        <article class="adm-card metric">
          <span class="adm-ico blue"><app-icon name="box" /></span>
          <div>
            <span>Total categories</span><strong>{{ total() }}</strong>
          </div>
        </article>
        <article class="adm-card metric">
          <span class="adm-ico green"><app-icon name="check" /></span>
          <div>
            <span>Active on this page</span><strong>{{ activeCount() }}</strong>
          </div>
        </article>
        <article class="adm-card metric">
          <span class="adm-ico amber"><app-icon name="eye" /></span>
          <div>
            <span>{{ "Total products" | translate }}</span><strong>{{ products() ?? "—" }}</strong>
          </div>
        </article>
        <article class="adm-card metric">
          <span class="adm-ico red"><app-icon name="close" /></span>
          <div>
            <span>Inactive on this page</span
            ><strong>{{ inactiveCount() }}</strong>
          </div>
        </article>
      </div>
      <div class="adm-table-card">
        <form class="adm-filter" (ngSubmit)="$event.preventDefault()">
          <input
            name="q"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            placeholder="Search by category name or description..."
          />
          <select
            name="status"
            [ngModel]="statusFilter()"
            (ngModelChange)="statusFilter.set($event)"
          >
            <option value="">{{ "All statuses" | translate }}</option>
            <option value="active">{{ "Active" | translate }}</option>
            <option value="inactive">{{ "Inactive" | translate }}</option>
          </select>
        </form>
        <div class="adm-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ "Category" | translate }}</th>
                <th>{{ "Description" | translate }}</th>
                <th>{{ "Status" | translate }}</th>
                <th>Created</th>
                <th>{{ "Action" | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of visible(); track field(row, "id")) {
                <tr>
                  <td>
                    <span class="adm-cat">
                      @if (field(row, "icon")) {
                        <img
                          appProductImage
                          class="adm-thumb"
                          [src]="text(field(row, 'icon'))"
                          alt=""
                        />
                      } @else {
                        <span class="adm-ico blue">{{ letter(row) }}</span>
                      }
                      {{ text(field(row, "name")) }}
                    </span>
                  </td>
                  <td>{{ text(field(row, "description")) }}</td>
                  <td>
                    <span
                      class="adm-badge"
                      [class.on]="activeRow(row)"
                      [class.off]="!activeRow(row)"
                      >{{ (activeRow(row) ? "Active" : "Inactive") | translate }}</span
                    >
                  </td>
                  <td>{{ dated(field(row, "created_at", "createdAt")) }}</td>
                  <td class="adm-actions">
                    <a
                      class="adm-btn icon"
                      [routerLink]="[
                        '/admin/categories/view',
                        field(row, 'id'),
                      ]"
                      aria-label="View category"
                       *appCanRoute="[
                        '/admin/categories/view',
                        field(row, 'id'),
                      ]"><app-icon name="eye"
                    /></a>
                    <a
                      class="adm-btn icon"
                      [routerLink]="[
                        '/admin/categories/edit',
                        field(row, 'id'),
                      ]"
                      aria-label="Edit category"
                       *appCanRoute="[
                        '/admin/categories/edit',
                        field(row, 'id'),
                      ]"><app-icon name="edit"
                    /></a>
                    <button
                      class="adm-btn icon danger"
                      type="button"
                      aria-label="Delete category"
                      (click)="remove(row)"
                     *appCan="'CATEGORY_CREATE'">
                      <app-icon name="trash" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">
                    <div class="adm-empty">
                      <strong>No categories</strong>
                      <p>No categories match this page.</p>
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
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (screen() === "form") {
      <div class="adm-page-head">
        <div>
          <h2>{{ (editId ? "Edit Category" : "Add Category") | translate }}</h2>
          <div class="adm-crumbs">
            <a routerLink="/admin" *appCanRoute="'/admin'">{{ "Dashboard" | translate }}</a>
            <span>›</span>
            <a routerLink="/admin/categories" *appCanRoute="'/admin/categories'">{{ "Categories" | translate }}</a>
            <span>›</span>
            <span>{{ (editId ? "Edit Category" : "Add Category") | translate }}</span>
          </div>
        </div>
        <div class="adm-head-actions">
          <a class="adm-btn" routerLink="/admin/categories" *appCanRoute="'/admin/categories'">{{ "Cancel" | translate }}</a>
          <button
            class="adm-btn adm-primary"
            type="submit"
            form="category-form"
            [disabled]="busy()"
          >
            {{ (editId ? "Save Changes" : "Save Category") | translate }}
          </button>
        </div>
      </div>
      <form id="category-form" class="adm-cols-2" (ngSubmit)="save()" *appCan="'CATEGORY_CREATE'">
        <article class="adm-panel">
          <div class="adm-section-title">
            <div>
              <h3>{{ "Category Information" | translate }}</h3>
              <p>
                {{
                  editId
                    ? "Update the details of this category."
                    : "Enter the details of the category."
                }}
              </p>
            </div>
          </div>
          <div class="adm-form full">
            <label>
              {{ "Category Name" | translate }}
              <span class="adm-req">*</span>
              <input
                name="name"
                [(ngModel)]="name"
                placeholder="e.g. Mobiles & Tablets"
                required
              />
            </label>
            <label>
              {{ "Description" | translate }}
              <textarea
                name="description"
                rows="4"
                maxlength="500"
                [ngModel]="description"
                (ngModelChange)="description = $event.slice(0, 500)"
                placeholder="Category description…"
              ></textarea>
              <span class="adm-count">{{ description.length }}/500</span>
            </label>
            <div>
              <span>{{ "Status" | translate }}</span>
              <div class="adm-actions">
                <label>
                  <input
                    type="radio"
                    name="activeMode"
                    [checked]="active"
                    (change)="active = true"
                  />
                  {{ "Active" | translate }}
                </label>
                <label>
                  <input
                    type="radio"
                    name="activeMode"
                    [checked]="!active"
                    (change)="active = false"
                  />
                  {{ "Inactive" | translate }}
                </label>
              </div>
            </div>
            <label>
              {{ "Category Type" | translate }}
              <input
                name="iconName"
                [value]="selectedIconName()"
                placeholder="Select an icon to set the type…"
                readonly
                class="adm-readonly"
              />
              <span class="adm-help"
                >This is filled in automatically from the icon you pick on the
                right.</span
              >
            </label>
          </div>
        </article>
        <div class="adm-stack">
          <aside class="adm-panel">
            <div class="adm-section-title">
              <h3>{{ "Category Icon" | translate }}</h3>
            </div>
            @if (iconError()) {
              <p class="adm-badge off">{{ iconError() }}</p>
            }
            @if (icons().length > 8) {
              <input
                name="iconQuery"
                [ngModel]="iconQuery()"
                (ngModelChange)="iconQuery.set($event)"
                placeholder="Search icons…"
              />
            }
            <div class="adm-icon-grid">
              @for (icon of visibleIcons(); track field(icon, "id")) {
                <button
                  type="button"
                  [class.on]="iconId === +field(icon, 'id')"
                  [attr.title]="iconLabel(icon)"
                  (click)="selectIcon(icon)"
                >
                  @if (iconId === +field(icon, "id")) {
                    <app-icon class="mark" name="check" />
                  }
                  @if (iconUrl(icon)) {
                    <img
                      appProductImage
                      [src]="iconUrl(icon)"
                      [alt]="iconLabel(icon)"
                    />
                  } @else {
                    <span class="adm-dot">{{
                      iconLabel(icon).slice(0, 1)
                    }}</span>
                  }
                  <span>{{ iconLabel(icon) }}</span>
                </button>
              } @empty {
                <p class="adm-help">No icons found.</p>
              }
            </div>
          </aside>
          <div class="adm-note">
            <app-icon name="help" />
            <div>
              <strong>{{ "Category visibility" | translate }}</strong>
              <p>
                Once saved, the category will be available for selection while
                adding or editing products.
              </p>
            </div>
          </div>
        </div>
      </form>
    }
    @if (screen() === "detail" && viewing(); as current) { <app-catalog-detail [row]="current" kind="Category" /> }
  </section> }`,
})
export class CategoriesPage extends PageState {
  private api = inject(AdminApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  screen = signal<"list" | "form" | "detail">("list");
  rows = signal<Row[]>([]);
  pages = signal(1);
  total = signal(0);
  products = signal<number | null>(null);
  page = 1;
  size = 10;
  sizes = [10, 20, 50];
  query = signal("");
  statusFilter = signal("");
  iconQuery = signal("");
  iconError = signal("");
  icons = signal<Row[]>([]);
  loadedIcon = "";
  editing = signal(false);
  viewing = signal<Row | null>(null);
  editId = 0;
  name = "";
  description = "";
  active = true;
  iconId = 0;
  field = field;
  text = text;
  dated = dated;
  visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    return this.rows().filter((row) => {
      const active = this.activeRow(row);
      if (status === "active" && !active) return false;
      if (status === "inactive" && active) return false;
      if (!q) return true;
      return `${field(row, "name")} ${field(row, "description")}`
        .toLowerCase()
        .includes(q);
    });
  });
  visibleIcons = computed(() => {
    const q = this.iconQuery().trim().toLowerCase();
    if (!q) return this.icons();
    return this.icons().filter((icon) =>
      String(field(icon, "name")).toLowerCase().includes(q),
    );
  });
  activeCount = computed(
    () => this.rows().filter((row) => this.activeRow(row)).length,
  );
  inactiveCount = computed(() => this.rows().length - this.activeCount());
  constructor() {
    super();
    const url = this.router.url.split("?")[0];
    const id = Number(this.route.snapshot.paramMap.get("id") || 0);
    this.api.inventorySummary().subscribe({
      next: (summary) => this.products.set(summary.total_products),
      error: () => this.products.set(null),
    });
    if (url.endsWith("/add")) {
      this.screen.set("form");
      this.open();
      return;
    }
    if (url.includes("/edit/") || url.includes("/view/")) {
      this.screen.set(url.includes("/view/") ? "detail" : "form");
      this.ensureIcons();
      this.run(this.api.category(id), (row) => {
        if (this.screen() === "detail") this.viewing.set(row);
        else this.apply(row);
      });
      return;
    }
    this.load();
  }
  load() {
    this.run(this.api.categories(this.page, this.size), (result) => {
      this.rows.set(result.items);
      this.pages.set(result.pages);
      this.total.set(result.total);
    });
  }
  open() {
    this.editId = 0;
    this.name = "";
    this.description = "";
    this.active = true;
    this.iconId = 0;
    this.loadedIcon = "";
    this.iconQuery.set("");
    this.ensureIcons();
    this.editing.set(true);
  }
  private apply(row: Row) {
    this.editId = Number(field(row, "id"));
    this.name = String(field(row, "name"));
    this.description = String(field(row, "description") || "").slice(0, 500);
    this.active = this.activeRow(row);
    this.readIcon(row);
    this.ensureIcons();
    this.matchIcon();
  }
  private readIcon(row: Row) {
    const icon = row["icon"];
    const direct = Number(field(row, "icon_id", "iconId") || 0);
    if (icon && typeof icon === "object") {
      const record = icon as Row;
      this.iconId = Number(field(record, "id") || direct || 0);
      this.loadedIcon = String(
        field(record, "url", "image_url", "image", "icon") || "",
      );
      return;
    }
    this.iconId = direct;
    this.loadedIcon = typeof icon === "string" ? icon : "";
  }
  private ensureIcons() {
    if (this.icons().length) return;
    this.api.icons().subscribe({
      next: (result) => {
        this.icons.set(result.items);
        this.iconError.set("");
        this.matchIcon();
      },
      error: () => {
        this.icons.set([]);
        this.iconError.set("Failed to load category icons.");
      },
    });
  }
  private matchIcon() {
    if (this.iconId || !this.loadedIcon) return;
    const match = this.icons().find(
      (icon) => this.iconUrl(icon) === this.loadedIcon,
    );
    if (match) this.iconId = Number(field(match, "id"));
  }
  iconUrl(icon: Row) {
    return String(
      field(icon, "url", "image_url", "icon_url", "image", "icon") || "",
    );
  }
  iconLabel(icon: Row) {
    const name = String(field(icon, "name", "label", "title") || "");
    return name || `Icon ${field(icon, "id")}`;
  }
  selectedIconName() {
    const match = this.icons().find(
      (icon) => Number(field(icon, "id")) === this.iconId,
    );
    return match ? this.iconLabel(match) : "";
  }
  selectIcon(icon: Row) {
    this.iconId = Number(field(icon, "id"));
  }
  save() {
    const editing = this.router.url.includes("/edit/");
    if (editing && !this.editId) return;
    if (!this.name.trim()) {
      this.error.set("Category name is required.");
      return;
    }
    const body: Row = {
      name: this.name.trim(),
      description: this.description.trim(),
      status: this.active,
    };
    if (this.iconId) body["icon_id"] = this.iconId;
    this.run(this.api.saveCategory(body, this.editId || undefined), () => {
      void this.router.navigate(["/admin/categories"]);
    });
  }
  remove(row: Row) {
    if (!confirm("Delete this category?")) return;
    this.run(this.api.deleteCategory(Number(field(row, "id"))), () => {
      if (this.viewing() && field(this.viewing()!, "id") === field(row, "id"))
        this.viewing.set(null);
      this.load();
      this.message.set("Category deleted.");
    });
  }
  activeRow(row: Row) {
    return field(row, "status") !== false;
  }
  letter(row: Row) {
    return String(field(row, "name") || "?")
      .slice(0, 1)
      .toUpperCase();
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
    this.page = page;
    this.load();
  }
  setSize(size: number) {
    this.size = Number(size);
    this.page = 1;
    this.load();
  }
  exportRows() {
    const lines = [
      ["name", "description", "status", "created_at"],
      ...this.visible().map((row) => [
        field(row, "name"),
        field(row, "description"),
        this.activeRow(row) ? "Active" : "Inactive",
        field(row, "created_at", "createdAt"),
      ]),
    ];
    const csv = lines
      .map((cols) =>
        cols
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "categories.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
}
