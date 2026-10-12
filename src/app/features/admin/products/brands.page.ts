import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { CatalogDetail } from "./catalog-detail";
import { ProductImage } from "../../../shared/components/product-image";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text, when } from "../api/admin.api";
@Component({
  imports: [TranslatePipe, CatalogDetail, Status, FormsModule, Icon, RouterLink, ProductImage],
  template: `<section>
    @if (screen() === "list") {
      <div class="adm-page-head">
        <div>
          <h2>{{ "Brands" | translate }}</h2>
          <p>
            Manage product brands and partnerships. Each brand is a catalog
            subcategory.
          </p>
        </div>
        <div class="adm-head-actions">
          <a class="adm-btn adm-primary" routerLink="/admin/brands/add"
            ><app-icon name="plus" /> {{ "Add brand" | translate }}</a
          >
        </div>
      </div>
      <div class="adm-stats" style="margin-bottom:14px">
        <article class="adm-card stat">
          <span class="adm-ico grad-blue"><app-icon name="tag" /></span
          ><span class="k">Total brands</span><strong>{{ total() }}</strong>
        </article>
        <article class="adm-card stat">
          <span class="adm-ico grad-green"><app-icon name="check" /></span
          ><span class="k">Active on this page</span
          ><strong>{{ activeCount() }}</strong>
        </article>
        <article class="adm-card stat">
          <span class="adm-ico grad-amber"><app-icon name="close" /></span
          ><span class="k">Inactive on this page</span
          ><strong>{{ inactiveCount() }}</strong>
        </article>
        <article class="adm-card stat">
          <span class="adm-ico grad-red"><app-icon name="trash" /></span
          ><span class="k">Deleted on this page</span
          ><strong>{{ deletedCount() }}</strong>
        </article>
      </div>
    }
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (screen() === "form") {
      <div class="adm-page-head">
        <div>
          <h2>{{ (brandId ? "Edit Brand" : "Add Brand") | translate }}</h2>
          <div class="adm-crumbs">
            <a routerLink="/admin">{{ "Dashboard" | translate }}</a>
            <span>›</span>
            <a routerLink="/admin/brands">{{ "Brands" | translate }}</a>
            <span>›</span>
            <span>{{ (brandId ? "Edit Brand" : "Add Brand") | translate }}</span>
          </div>
        </div>
        <div class="adm-head-actions">
          <a class="adm-btn" routerLink="/admin/brands">{{ "Cancel" | translate }}</a>
          <button
            class="adm-btn adm-primary"
            type="submit"
            form="brand-form"
            [disabled]="busy()"
          >
            {{ brandId ? "Update Brand" : "Save Brand" }}
          </button>
        </div>
      </div>
      <form id="brand-form" class="adm-cols-2" (ngSubmit)="save()">
        <div class="adm-stack">
          <article class="adm-panel">
            <div class="adm-section-title">
              <div>
                <h3>{{ "Brand Information" | translate }}</h3>
                <p>
                  {{
                    brandId
                      ? "Update the details of the brand."
                      : "Enter the details of the brand you want to add."
                  }}
                </p>
              </div>
            </div>
            <div class="adm-form full">
              <label>
                {{ "Brand Name" | translate }}
                <span class="adm-req">*</span>
                <input
                  name="brand"
                  [(ngModel)]="brandName"
                  placeholder="Enter brand name"
                  required
                />
              </label>
              <label>
                {{ "Description" | translate }}
                <textarea
                  name="description"
                  rows="4"
                  maxlength="500"
                  [ngModel]="brandDescription"
                  (ngModelChange)="brandDescription = $event.slice(0, 500)"
                  placeholder="Enter brand description"
                ></textarea>
                <span class="adm-count">{{ brandDescription.length }}/500</span>
              </label>
              <label>
                {{ "Category" | translate }}
                <select name="category" [(ngModel)]="brandCategory">
                  <option [ngValue]="0" disabled>{{ "Select category" | translate }}</option>
                  @for (category of categories(); track field(category, "id")) {
                    <option [ngValue]="+field(category, 'id')">
                      {{ field(category, "name") }}
                    </option>
                  }
                </select>
              </label>
            </div>
          </article>
          <div class="adm-note">
            <app-icon name="help" />
            <div>
              <strong>{{ "Brand visibility" | translate }}</strong>
              <p>
                Once saved, the brand will be available for selection while
                adding or editing products.
              </p>
            </div>
          </div>
        </div>
        <article class="adm-panel">
          <div class="adm-section-title">
            <div>
              <h3>{{ "Brand Logo" | translate }}</h3>
              <p>Upload a logo for the brand.</p>
            </div>
          </div>
          @if (logoError()) {
            <p class="adm-badge off">{{ logoError() }}</p>
          }
          @if (logos().length > 8) {
            <input
              name="logoQuery"
              [ngModel]="logoQuery()"
              (ngModelChange)="logoQuery.set($event)"
              placeholder="Search logos…"
            />
          }
          <div class="adm-icon-grid" style="margin:12px 0">
            @for (logo of visibleLogos(); track field(logo, "id")) {
              <button
                type="button"
                [class.on]="logoId === +field(logo, 'id')"
                [attr.title]="logoLabel(logo)"
                (click)="selectLogo(logo)"
              >
                @if (logoId === +field(logo, "id")) {
                  <app-icon class="mark" name="check" />
                }
                @if (logoUrl(logo)) {
                  <img
                    appProductImage
                    [src]="logoUrl(logo)"
                    [alt]="logoLabel(logo)"
                  />
                } @else {
                  <span class="adm-dot">{{ logoLabel(logo).slice(0, 1) }}</span>
                }
                <span>{{ logoLabel(logo) }}</span>
              </button>
            } @empty {
              <p class="adm-help">No logos found.</p>
            }
          </div>
          @if (preview() || currentImage()) {
            <div class="adm-logo">
              <img
                appProductImage
                [src]="preview() || currentImage()"
                alt="Brand logo preview"
              />
              <button
                class="adm-btn icon"
                type="button"
                (click)="clearLogo()"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          }
          <label
            class="adm-drop"
            (dragover)="allowDrop($event)"
            (drop)="dropFile($event)"
          >
            <strong>Drag and drop your file here</strong>
            <span>or</span>
            <span class="adm-btn">Browse Files</span>
            <span>{{
              brandFile
                ? brandFile.name
                : logoId
                  ? selectedLogoName()
                  : currentImage()
                    ? "Using current image"
                    : "No image selected"
            }}</span>
            <small>PNG, JPG, SVG up to 2MB. Recommended size: 512x512px</small>
            <input
              name="file"
              type="file"
              accept="image/*"
              (change)="pick($event)"
            />
          </label>
        </article>
      </form>
    }
    @if (screen() === "list") {
      <div class="adm-table-card">
        <form class="adm-filter" (ngSubmit)="page = 1; load()">
          <input name="q" [(ngModel)]="name" placeholder="Search brands..." />
          <select
            name="filterCategory"
            [ngModel]="categoryFilter()"
            (ngModelChange)="categoryFilter.set($event)"
          >
            <option value="">{{ "All categories" | translate }}</option>
            @for (category of categories(); track field(category, "id")) {
              <option [value]="'' + field(category, 'id')">
                {{ field(category, "name") }}
              </option>
            }
          </select>
          <select
            name="filterStatus"
            [ngModel]="statusFilter()"
            (ngModelChange)="statusFilter.set($event)"
          >
            <option value="">{{ "All statuses" | translate }}</option>
            <option value="active">{{ "Active" | translate }}</option>
            <option value="inactive">{{ "Inactive" | translate }}</option>
            <option value="deleted">Deleted</option>
          </select>
          <button class="adm-btn adm-primary" [disabled]="busy()">
            {{ "Search" | translate }}
          </button>
          @if (hasFilters()) {
            <button class="adm-btn" type="button" (click)="clearFilters()">
              {{ "Clear filters" | translate }}
            </button>
          }
        </form>
        <div class="adm-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ "Brand" | translate }}</th>
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
                    <span class="adm-who">
                      @if (logo(row)) {
                        <img
                          appProductImage
                          class="adm-thumb"
                          [src]="logo(row)"
                          alt=""
                        />
                      } @else {
                        <span class="adm-dot">{{ initials(row) }}</span>
                      }
                      <span
                        ><b>{{ text(field(row, "name")) }}</b></span
                      >
                    </span>
                  </td>
                  <td>
                    {{ text(field(row, "category_name", "categoryName")) }}
                  </td>
                  <td>{{ text(field(row, "description")) }}</td>
                  <td>
                    <span
                      class="adm-badge"
                      [class.on]="statusLabel(row) === 'Active'"
                      [class.off]="
                        statusLabel(row) === 'Inactive' ||
                        statusLabel(row) === 'Deleted'
                      "
                      >{{ text(statusLabel(row)) }}</span
                    >
                  </td>
                  <td>{{ when(field(row, "created_at", "createdAt")) }}</td>
                  <td class="adm-actions">
                    <a
                      class="adm-btn icon"
                      [routerLink]="['/admin/brands/view', field(row, 'id')]"
                      aria-label="View brand"
                      ><app-icon name="eye"
                    /></a>
                    <a
                      class="adm-btn icon"
                      [routerLink]="['/admin/brands/edit', field(row, 'id')]"
                      aria-label="Edit brand"
                      ><app-icon name="edit"
                    /></a>
                    <button
                      class="adm-btn icon danger"
                      type="button"
                      aria-label="Delete brand"
                      (click)="remove(row)"
                    >
                      <app-icon name="trash" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">
                    <div class="adm-empty">
                      <strong>No brands</strong>
                      <p>No brands on this page.</p>
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
    @if (screen() === "detail" && viewing(); as current) { <app-catalog-detail [row]="current" kind="Brand" /> }
  </section>`,
})
export class BrandsPage extends PageState {
  private api = inject(AdminApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  screen = signal<"list" | "form" | "detail">("list");
  rows = signal<Row[]>([]);
  categories = signal<Row[]>([]);
  pages = signal(1);
  total = signal(0);
  page = 1;
  size = 10;
  sizes = [10, 20, 50];
  name = "";
  categoryFilter = signal("");
  statusFilter = signal("");
  editing = signal(false);
  viewing = signal<Row | null>(null);
  brandId = 0;
  brandName = "";
  brandCategory = 0;
  brandDescription = "";
  brandFile: File | null = null;
  logoId = 0;
  logos = signal<Row[]>([]);
  logoQuery = signal("");
  logoError = signal("");
  preview = signal("");
  currentImage = signal("");
  field = field;
  text = text;
  when = when;
  visible = computed(() => {
    const category = this.categoryFilter();
    const status = this.statusFilter();
    return this.rows().filter((row) => {
      if (
        category &&
        String(field(row, "categoryId", "CategoryId")) !== category
      )
        return false;
      const label = this.statusLabel(row).toLowerCase();
      if (status && label !== status) return false;
      return true;
    });
  });
  activeCount = computed(
    () =>
      this.rows().filter((row) => this.statusLabel(row) === "Active").length,
  );
  inactiveCount = computed(
    () =>
      this.rows().filter((row) => this.statusLabel(row) === "Inactive").length,
  );
  deletedCount = computed(
    () =>
      this.rows().filter((row) => this.statusLabel(row) === "Deleted").length,
  );
  visibleLogos = computed(() => {
    const q = this.logoQuery().trim().toLowerCase();
    if (!q) return this.logos();
    return this.logos().filter((logo) =>
      String(field(logo, "name")).toLowerCase().includes(q),
    );
  });
  constructor() {
    super();
    const url = this.router.url.split("?")[0];
    const id = Number(this.route.snapshot.paramMap.get("id") || 0);
    this.api.allCategories().subscribe({
      next: (rows) => this.categories.set(rows),
      error: () =>
        this.error.set("Could not load category choices. Please reload."),
    });
    if (url.endsWith("/add")) {
      this.screen.set("form");
      this.open();
      return;
    }
    if (url.includes("/edit/") || url.includes("/view/")) {
      this.screen.set(url.includes("/view/") ? "detail" : "form");
      this.run(this.api.brand(id), (row) => {
        if (this.screen() === "detail") this.viewing.set(row);
        else this.edit(row);
      });
      return;
    }
    this.load();
  }
  load() {
    this.run(
      this.api.brands(this.page, this.name.trim(), this.size),
      (result) => {
        this.rows.set(result.items);
        this.pages.set(result.pages);
        this.total.set(result.total);
      },
    );
  }
  open() {
    this.clearPreview();
    this.viewing.set(null);
    this.brandId = 0;
    this.brandName = "";
    this.brandCategory = 0;
    this.brandDescription = "";
    this.brandFile = null;
    this.logoId = 0;
    this.logoQuery.set("");
    this.currentImage.set("");
    this.ensureLogos();
    this.editing.set(true);
  }
  close() {
    this.clearPreview();
    this.brandFile = null;
    this.logoId = 0;
    this.currentImage.set("");
    this.editing.set(false);
  }
  allowDrop(event: DragEvent) {
    event.preventDefault();
  }
  dropFile(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] || null;
    if (file) this.useFile(file);
  }
  pick(event: Event) {
    const input = event.target as HTMLInputElement;
    this.useFile(input.files?.[0] || null);
    input.value = "";
  }
  private useFile(file: File | null) {
    this.logoId = 0;
    this.brandFile = file;
    this.clearPreview();
    if (file) this.preview.set(URL.createObjectURL(file));
  }
  clearLogo() {
    this.brandFile = null;
    this.logoId = 0;
    this.currentImage.set("");
    this.clearPreview();
  }
  private clearPreview() {
    const url = this.preview();
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    this.preview.set("");
  }
  private ensureLogos() {
    if (this.logos().length) return;
    this.api.brandLogos().subscribe({
      next: (result) => {
        this.logos.set(result.items);
        this.logoError.set("");
        this.matchLogo();
      },
      error: () => {
        this.logos.set([]);
        this.logoError.set("Failed to load brand logos.");
      },
    });
  }
  private matchLogo() {
    if (this.logoId || !this.currentImage()) return;
    const match = this.logos().find(
      (logo) => this.logoUrl(logo) === this.currentImage(),
    );
    if (match) this.logoId = Number(field(match, "id"));
  }
  logoUrl(logo: Row) {
    return String(field(logo, "url", "image_url", "image") || "");
  }
  logoLabel(logo: Row) {
    const name = String(field(logo, "name", "label", "title") || "");
    return name || `Logo ${field(logo, "id")}`;
  }
  selectedLogoName() {
    const match = this.logos().find(
      (logo) => Number(field(logo, "id")) === this.logoId,
    );
    return match ? this.logoLabel(match) : "";
  }
  selectLogo(logo: Row) {
    this.brandFile = null;
    this.clearPreview();
    this.logoId = Number(field(logo, "id"));
    this.preview.set(this.logoUrl(logo));
  }
  view(row: Row) {
    this.viewing.set(row);
  }
  edit(row: Row) {
    this.clearPreview();
    this.viewing.set(null);
    this.brandId = Number(field(row, "id"));
    this.brandName = String(field(row, "name"));
    this.brandCategory = Number(field(row, "categoryId", "CategoryId") || 0);
    this.brandDescription = String(field(row, "description") || "");
    this.brandFile = null;
    this.logoId = 0;
    this.logoQuery.set("");
    this.currentImage.set(String(field(row, "image") || ""));
    this.ensureLogos();
    this.matchLogo();
    this.editing.set(true);
  }
  save() {
    const editing = this.router.url.includes("/edit/");
    if (editing && !this.brandId) return;
    const name = this.brandName.trim();
    if (!name) {
      this.error.set("Brand name is required.");
      return;
    }
    if (!this.brandCategory) {
      this.error.set("Category is required.");
      return;
    }
    if (!editing && !this.brandFile && !this.logoId) {
      this.error.set("Upload a logo for the brand.");
      return;
    }
    const logoId = this.brandFile ? undefined : this.logoId || undefined;
    this.run(
      this.api.saveBrand(
        name,
        this.brandCategory,
        this.brandDescription.trim(),
        this.brandId || undefined,
        this.brandFile,
        logoId,
      ),
      () => {
        this.close();
        void this.router.navigate(["/admin/brands"]);
      },
    );
  }
  remove(row: Row) {
    if (!confirm("Delete this brand?")) return;
    this.run(this.api.deleteBrand(Number(field(row, "id"))), () => {
      if (this.viewing() && field(this.viewing()!, "id") === field(row, "id"))
        this.viewing.set(null);
      this.load();
      this.message.set("Brand deleted.");
    });
  }
  logo(row: Row) {
    return String(field(row, "image") || "");
  }
  initials(row: Row) {
    return String(field(row, "name") || "?")
      .slice(0, 2)
      .toUpperCase();
  }
  statusLabel(row: Row) {
    const status = field(row, "status", "Status");
    if (status === true || status === "active") return "Active";
    if (status === false || status === "inactive") return "Inactive";
    if (status === "deleted") return "Deleted";
    return "";
  }
  hasFilters() {
    return (
      !!this.name.trim() || !!this.categoryFilter() || !!this.statusFilter()
    );
  }
  clearFilters() {
    this.name = "";
    this.categoryFilter.set("");
    this.statusFilter.set("");
    this.page = 1;
    this.load();
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
