import { ProductImage } from "../../shared/product-image";
import { Component, computed, inject, OnDestroy, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin, switchMap, map, catchError, of } from "rxjs";
import { PageState } from "../../shared/page-state";
import { Icon } from "../../shared/icon";
import { Status } from "../../shared/status";
import { AdminApi, field, Row, text, usd, when } from "./admin.api";
function skuPrice(row: Row) {
  const skus = row["skus"];
  if (!Array.isArray(skus) || !skus.length) return "";
  return field(skus[0] as Row, "price", "finalPrice");
}
function image(row: Row) {
  const value = row["main_image"];
  if (Array.isArray(value)) return String(value[0] || "");
  return typeof value === "string" ? value : "";
}
function imagesOf(row: Row) {
  const value = row["main_image"];
  if (Array.isArray(value))
    return value.map((item) => String(item)).filter(Boolean);
  return typeof value === "string" && value ? [value] : [];
}
function firstSku(row: Row): Row | null {
  const skus = row["skus"];
  if (!Array.isArray(skus) || !skus.length) return null;
  return skus[0] as Row;
}
function skuCode(row: Row) {
  const direct = field(row, "sku", "sku_code");
  if (direct !== "") return direct;
  const sku = firstSku(row);
  return sku ? field(sku, "sku", "sku_code") : "";
}
function stock(row: Row) {
  const direct = field(row, "stock", "stock_qty", "available_qty", "quantity");
  if (direct !== "") return direct;
  const sku = firstSku(row);
  if (!sku) return "";
  const qty = field(sku, "quantity", "stock", "available_qty", "stock_qty");
  if (qty !== "") return qty;
  const inventory = sku["inventory"];
  if (inventory && typeof inventory === "object") {
    return field(inventory as Row, "available_qty", "stock_qty", "quantity");
  }
  return "";
}
function categoryOf(row: Row) {
  return field(row, "category", "category_name", "categoryName");
}
function brandOf(row: Row) {
  const named = field(row, "brand", "brand_name", "brandName");
  if (named !== "") return named;
  const sub = row["sub_category"] ?? row["subCategory"];
  return sub && typeof sub === "object" ? field(sub as Row, "name") : "";
}
function warehouseOf(sku: Row) {
  const inventory = sku["inventory"];
  if (inventory && typeof inventory === "object") {
    return field(inventory as Row, "warehouse_location", "warehouse");
  }
  return field(sku, "warehouse_location", "warehouse");
}
function attrsOf(sku: Row) {
  const value = sku["attributes"] ?? sku["product_attributes"];
  return Array.isArray(value) ? (value as Row[]) : [];
}
function attrText(attr: Row) {
  const values = attr["attributes"];
  if (!Array.isArray(values)) return "";
  return values
    .map((value) => field(value as Row, "value"))
    .filter((value) => value !== "")
    .join(", ");
}
@Component({
  imports: [Status, RouterLink, FormsModule, Icon, ProductImage],
  template: `<section>
    <div class="adm-page-head">
      <div>
        <h2>Products</h2>
        <p>Manage your product inventory and pricing.</p>
      </div>
      <div class="adm-head-actions">
        <a class="adm-btn adm-primary" routerLink="/admin/products/add"
          ><app-icon name="plus" /> Add product</a
        >
      </div>
    </div>
    <div class="adm-stats" style="margin-bottom:14px">
      <article class="adm-card stat">
        <span class="adm-ico grad-blue"><app-icon name="box" /></span
        ><span class="k">Total products</span><strong>{{ total() }}</strong>
      </article>
      <article class="adm-card stat">
        <span class="adm-ico grad-green"><app-icon name="check" /></span
        ><span class="k">Active on this page</span
        ><strong>{{ activeCount() }}</strong>
      </article>
      <article class="adm-card stat">
        <span class="adm-ico grad-red"><app-icon name="close" /></span
        ><span class="k">Inactive on this page</span
        ><strong>{{ inactiveCount() }}</strong>
      </article>
    </div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    <div class="adm-table-card">
      <form class="adm-filter" (ngSubmit)="page = 1; load()">
        <input name="q" [(ngModel)]="name" placeholder="Search products..." />
        <select
          name="status"
          [ngModel]="statusFilter()"
          (ngModelChange)="setStatus($event)"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button class="adm-btn adm-primary" [disabled]="busy()">Search</button>
        @if (name || statusFilter()) {
          <button class="adm-btn" type="button" (click)="clearFilters()">
            Clear filters
          </button>
        }
      </form>
      <div class="adm-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (row of visible(); track field(row, "id")) {
              <tr>
                <td>
                  <span class="adm-who">
                    @if (image(row)) {
                      <img
                        appProductImage
                        class="adm-thumb"
                        [src]="image(row)"
                        alt=""
                      />
                    } @else {
                      <span class="adm-dot">{{ letter(row) }}</span>
                    }
                    <span
                      ><b>{{ text(field(row, "name")) }}</b
                      ><small>{{ text(skuCode(row)) }}</small></span
                    >
                  </span>
                </td>
                <td>{{ text(skuCode(row)) }}</td>
                <td>{{ text(categoryOf(row)) }}</td>
                <td>{{ text(brandOf(row)) }}</td>
                <td>{{ usd(skuPrice(row)) }}</td>
                <td>{{ text(stock(row)) }}</td>
                <td>
                  <span
                    class="adm-badge"
                    [class.on]="activeRow(row)"
                    [class.off]="!activeRow(row)"
                    >{{ activeRow(row) ? "Active" : "Inactive" }}</span
                  >
                </td>
                <td>{{ when(field(row, "created_at", "createdAt")) }}</td>
                <td>{{ when(field(row, "updated_at", "updatedAt")) }}</td>
                <td class="adm-actions">
                  <a
                    class="adm-btn icon"
                    [routerLink]="['/admin/products/view', field(row, 'id')]"
                    aria-label="View product"
                    ><app-icon name="eye"
                  /></a>
                  <a
                    class="adm-btn icon"
                    [routerLink]="['/admin/products/edit', field(row, 'id')]"
                    aria-label="Edit product"
                    ><app-icon name="edit"
                  /></a>
                  <button
                    class="adm-btn icon"
                    type="button"
                    [attr.aria-label]="
                      activeRow(row) ? 'Deactivate product' : 'Activate product'
                    "
                    (click)="toggle(row)"
                  >
                    <app-icon [name]="activeRow(row) ? 'close' : 'check'" />
                  </button>
                  <button
                    class="adm-btn icon danger"
                    type="button"
                    aria-label="Delete product"
                    (click)="remove(row)"
                  >
                    <app-icon name="trash" />
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="10">
                  <div class="adm-empty">
                    <strong>No products</strong>
                    <p>No products on this page.</p>
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
  </section>`,
})
export class ProductsPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  rows = signal<Row[]>([]);
  total = signal(0);
  pages = signal(1);
  page = 1;
  size = 10;
  sizes = [10, 20, 50];
  name = "";
  statusFilter = signal("");
  field = field;
  text = text;
  usd = usd;
  when = when;
  image = image;
  skuPrice = skuPrice;
  skuCode = skuCode;
  stock = stock;
  categoryOf = categoryOf;
  brandOf = brandOf;
  visible = computed(() => {
    const status = this.statusFilter();
    if (!status) return this.rows();
    return this.rows().filter((row) =>
      status === "active" ? this.activeRow(row) : !this.activeRow(row),
    );
  });
  activeCount = computed(
    () => this.rows().filter((row) => this.activeRow(row)).length,
  );
  inactiveCount = computed(() => this.rows().length - this.activeCount());
  constructor() {
    super();
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get("q") || "";
      if (q === this.name && this.rows().length) return;
      this.name = q;
      this.page = 1;
      this.load();
    });
  }
  load() {
    this.run(
      this.api.products(
        this.page,
        this.name.trim(),
        this.size,
        this.statusFilter(),
      ),
      (result) => {
        this.rows.set(result.items);
        this.total.set(result.total);
        this.pages.set(result.pages);
      },
    );
  }
  toggle(row: Row) {
    const active = field(row, "is_active") === false;
    this.run(this.api.productStatus(Number(field(row, "id")), active), () => {
      this.load();
      this.message.set("Status updated.");
    });
  }
  remove(row: Row) {
    if (!confirm("Delete this product?")) return;
    this.run(this.api.deleteProduct(Number(field(row, "id"))), () => {
      this.load();
      this.message.set("Product deleted.");
    });
  }
  activeRow(row: Row) {
    return field(row, "is_active") !== false;
  }
  letter(row: Row) {
    return String(field(row, "name") || "?")
      .slice(0, 1)
      .toUpperCase();
  }
  setStatus(status: string) {
    this.statusFilter.set(status);
    this.page = 1;
    this.load();
  }
  clearFilters() {
    this.name = "";
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
type SkuAttribute = {
  name: string;
  values: string[];
};
type SkuDraft = {
  productSkuId?: number;
  sku?: string;
  description: string;
  price: number;
  quantity: number;
  barcode: string;
  warehouse: string;
  useAttributes: boolean;
  attributes: SkuAttribute[];
};
@Component({
  imports: [Status, RouterLink, FormsModule, Icon, ProductImage],
  templateUrl: "./product-form.html",
  styleUrl: "./product-form.css",
})
export class ProductFormPage extends PageState implements OnDestroy {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  brands = signal<Row[]>([]);
  categories = signal<Row[]>([]);
  images = signal<string[]>([]);
  previews = signal<string[]>([]);
  id = 0;
  variants: SkuDraft[] = [this.newVariant(true)];
  defaultVariant = 0;
  name = "";
  description = "";
  categoryId = 0;
  subCategoryId = 0;
  active = true;
  hasVariants = false;
  basePrice = 0;
  baseQuantity = 1;
  baseWarehouse = "";
  lowStockThreshold = 5;
  variantAttributes = [
    { name: "Size", input: "" },
    { name: "Color", input: "" },
  ];
  bulkField = "price";
  bulkValue = 0;
  bulkMode = "SET";
  editingVariant = -1;
  files: File[] = [];
  field = field;
  constructor() {
    super();
    this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get("id") || 0);
      const duplicateId = Number(
        this.route.snapshot?.queryParamMap?.get("duplicate") || 0,
      );
      this.files = [];
      for (const url of this.previews()) URL.revokeObjectURL(url);
      this.previews.set([]);
      if (!this.id && !duplicateId) {
        this.images.set([]);
        this.run(
          forkJoin({
            brands: this.api.allBrands(),
            categories: this.api.allCategories(),
          }),
          (result) => {
            this.brands.set(result.brands);
            this.categories.set(result.categories);
          },
        );
        return;
      }
      this.run(
        forkJoin({
          brands: this.api.allBrands(),
          categories: this.api.allCategories(),
          product: this.api.product(this.id || duplicateId),
        }),
        (result) => {
          this.brands.set(result.brands);
          this.categories.set(result.categories);
          this.applyProduct(result.product);
          if (duplicateId && !this.id) {
            this.name += " (copy)";
            this.variants = this.variants.map((variant) => ({
              ...variant,
              productSkuId: undefined,
              sku: undefined,
              barcode: "",
            }));
            this.images.set([]);
            this.message.set(
              "Product copied. Upload images before saving the new product.",
            );
          }
        },
      );
    });
  }
  ngOnDestroy() {
    for (const url of this.previews()) URL.revokeObjectURL(url);
  }
  private applyProduct(row: Row) {
    this.name = String(field(row, "name"));
    this.description = String(field(row, "description") || "");
    this.subCategoryId = Number(
      field(row, "subcategoryId", "SubcategoryId", "sub_category_id") || 0,
    );
    this.active = field(row, "is_active") !== false;
    this.images.set(imagesOf(row));
    const brand = this.brands().find(
      (item) => Number(field(item, "id")) === this.subCategoryId,
    );
    this.categoryId = brand ? this.categoryOfBrand(brand) : 0;
    if (!this.categoryId) this.categoryId = this.categoryFromProduct(row);
    const skus = Array.isArray(row["skus"]) ? (row["skus"] as Row[]) : [];
    this.variants = skus.map((sku) => this.skuFromApi(sku));
    if (!this.variants.length) this.variants = [this.newVariant(true)];
    const selected = skus.findIndex((sku) => field(sku, "is_default") === true);
    this.defaultVariant = selected >= 0 ? selected : 0;
    this.hasVariants = this.variants.length > 1;
    this.basePrice = this.variants[0].price;
    this.baseQuantity = this.variants[0].quantity;
    this.baseWarehouse = this.variants[0].warehouse;
    this.lowStockThreshold = Number(
      skus[0]?.["low_stock_threshold"] ?? skus[0]?.["lowStockThreshold"] ?? 5,
    );
  }
  private categoryOfBrand(row: Row) {
    return Number(field(row, "categoryId", "CategoryId", "category_id") || 0);
  }
  private categoryFromProduct(row: Row) {
    const direct = Number(field(row, "categoryId", "category_id") || 0);
    if (direct) return direct;
    const sub = row["sub_category"] ?? row["subCategory"];
    if (!sub || typeof sub !== "object") return 0;
    const nested = (sub as Row)["category"];
    if (nested && typeof nested === "object")
      return Number(field(nested as Row, "id") || 0);
    return Number(field(sub as Row, "categoryId", "category_id") || 0);
  }
  private skuFromApi(sku: Row): SkuDraft {
    const inventory = sku["inventory"];
    const quantity =
      inventory && typeof inventory === "object"
        ? Number(field(inventory as Row, "quantity") || sku["quantity"] || 0)
        : Number(sku["quantity"] || 0);
    const attributes = this.attributesFromApi(sku);
    return {
      productSkuId: Number(field(sku, "id", "productSkuId")) || undefined,
      sku: String(field(sku, "sku")),
      description: String(field(sku, "description", "sku") || ""),
      price: Number(field(sku, "price") || 0),
      quantity,
      barcode: String(field(sku, "barcode") || ""),
      warehouse: String(warehouseOf(sku) || ""),
      useAttributes: attributes.length > 0,
      attributes,
    };
  }
  private attributesFromApi(sku: Row): SkuAttribute[] {
    const value = sku["product_attributes"] ?? sku["attributes"];
    if (!Array.isArray(value)) return [];
    return (value as Row[]).map((attribute) => {
      const values = attribute["attributes"];
      const list = Array.isArray(values)
        ? (values as Row[]).map((item) =>
            String(field(item as Row, "value") || ""),
          )
        : [""];
      return {
        name: String(field(attribute, "name") || ""),
        values: list.length ? list : [""],
      };
    });
  }
  private newVariant(isDefault = false): SkuDraft {
    if (isDefault) this.defaultVariant = 0;
    return {
      description: "",
      price: 0,
      quantity: 1,
      barcode: "",
      warehouse: "",
      useAttributes: false,
      attributes: [],
    };
  }
  setCategory(id: number) {
    this.categoryId = Number(id);
    const ids = this.brands()
      .filter((row) => this.categoryOfBrand(row) === this.categoryId)
      .map((row) => Number(field(row, "id")));
    if (!ids.includes(this.subCategoryId)) this.subCategoryId = 0;
  }
  brandChoices() {
    const selectedId = Number(this.subCategoryId);
    const selected = this.brands().filter(
      (row) => Number(field(row, "id")) === selectedId,
    );
    if (!this.categoryId) return selected;
    const matches = this.brands().filter(
      (row) => this.categoryOfBrand(row) === Number(this.categoryId),
    );
    if (
      this.id &&
      selected.length &&
      !matches.some((row) => Number(field(row, "id")) === selectedId)
    )
      return [...selected, ...matches];
    return matches;
  }
  subCategoryPlaceholder() {
    if (!this.categoryId && !this.brandChoices().length)
      return "— Select a category first —";
    if (!this.brandChoices().length) return "No sub-categories found";
    return "— Select sub-category —";
  }
  addVariant() {
    this.hasVariants = true;
    this.variants = [
      ...this.variants,
      this.newVariant(this.variants.length === 0),
    ];
  }
  removeVariant(index: number) {
    this.editingVariant = -1;
    const removedDefault = this.defaultVariant === index;
    this.variants = this.variants.filter((_, position) => position !== index);
    if (!this.variants.length) {
      this.variants = [this.newVariant(true)];
      this.defaultVariant = 0;
      return;
    }
    if (removedDefault) this.defaultVariant = 0;
    else if (this.defaultVariant > index) this.defaultVariant -= 1;
  }
  toggleAttributes(index: number, enabled: boolean) {
    const variant = this.variants[index];
    variant.useAttributes = enabled;
    variant.attributes = enabled
      ? variant.attributes.length
        ? variant.attributes
        : [{ name: "", values: [""] }]
      : [];
  }
  addAttribute(index: number) {
    const variant = this.variants[index];
    variant.useAttributes = true;
    variant.attributes = [...variant.attributes, { name: "", values: [""] }];
  }
  removeAttribute(index: number, group: number) {
    const variant = this.variants[index];
    variant.attributes = variant.attributes.filter(
      (_, position) => position !== group,
    );
  }
  addValue(index: number, group: number) {
    const attribute = this.variants[index].attributes[group];
    attribute.values = [...attribute.values, ""];
  }
  removeValue(index: number, group: number, valueIndex: number) {
    const attribute = this.variants[index].attributes[group];
    const next = attribute.values.filter(
      (_, position) => position !== valueIndex,
    );
    attribute.values = next.length ? next : [""];
  }
  allowDrop(event: DragEvent) {
    event.preventDefault();
  }
  dropFiles(event: DragEvent) {
    event.preventDefault();
    this.addFiles(event.dataTransfer?.files);
  }
  pick(event: Event) {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = "";
  }
  private addFiles(list: FileList | null | undefined) {
    if (!list?.length) return;
    const images = Array.from(list);
    if (
      images.some(
        (file) =>
          !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      this.error.set("Choose PNG, JPG or WEBP images no larger than 5 MB.");
      return;
    }
    if (this.files.length + images.length > 6) {
      this.error.set("Upload up to 6 product images.");
      return;
    }
    this.error.set("");
    this.files = [...this.files, ...images];
    this.previews.set([
      ...this.previews(),
      ...images.map((file) => URL.createObjectURL(file)),
    ]);
  }
  removeFile(index: number) {
    const urls = this.previews();
    URL.revokeObjectURL(urls[index]);
    this.files = this.files.filter((_, position) => position !== index);
    this.previews.set(urls.filter((_, position) => position !== index));
  }
  makePrimary(index: number) {
    if (index < 1 || index >= this.files.length) return;
    this.files = [
      this.files[index],
      ...this.files.filter((_, position) => position !== index),
    ];
    const urls = this.previews();
    this.previews.set([
      urls[index],
      ...urls.filter((_, position) => position !== index),
    ]);
  }
  splitValues(input: string) {
    return [
      ...new Set(
        input
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
  }
  addGeneratorAttribute() {
    this.variantAttributes = [
      ...this.variantAttributes,
      { name: "", input: "" },
    ];
  }
  removeGeneratorAttribute(index: number) {
    this.variantAttributes = this.variantAttributes.filter(
      (_, position) => position !== index,
    );
  }
  setHasVariants(enabled: boolean) {
    if (this.id) return;
    this.hasVariants = enabled;
    if (!enabled) {
      this.variants = [
        { ...this.variants[0], useAttributes: false, attributes: [] },
      ];
      this.defaultVariant = 0;
      this.syncSingleVariant();
    }
  }
  syncSingleVariant() {
    if (this.hasVariants || this.id) return;
    Object.assign(this.variants[0], {
      price: Number(this.basePrice),
      quantity: Number(this.baseQuantity),
      warehouse: this.baseWarehouse,
    });
  }
  generateVariants() {
    if (this.id || !this.hasVariants) return;
    const attributes = this.variantAttributes.map((attribute) => ({
      name: attribute.name.trim(),
      values: this.splitValues(attribute.input),
    }));
    if (
      !attributes.length ||
      attributes.some(
        (attribute) => !attribute.name || !attribute.values.length,
      )
    ) {
      this.error.set(
        "Enter a name and at least one value for each variant attribute.",
      );
      return;
    }
    if (
      new Set(attributes.map((attribute) => attribute.name.toLowerCase()))
        .size !== attributes.length
    ) {
      this.error.set("Each variant attribute needs a different name.");
      return;
    }
    const count = attributes.reduce(
      (total, attribute) => total * attribute.values.length,
      1,
    );
    if (count > 100) {
      this.error.set(
        "Use fewer attribute values. Generate up to 100 variants at a time.",
      );
      return;
    }
    let combinations: SkuAttribute[][] = [[]];
    for (const attribute of attributes) {
      combinations = combinations.flatMap((combination) =>
        attribute.values.map((value) => [
          ...combination,
          { name: attribute.name, values: [value] },
        ]),
      );
    }
    this.variants = combinations.map((attributes) => ({
      description: [
        this.name.trim() || "Variant",
        ...attributes.flatMap((attribute) => attribute.values),
      ].join(" — "),
      price: Number(this.basePrice),
      quantity: Number(this.baseQuantity),
      warehouse: this.baseWarehouse,
      barcode: "",
      useAttributes: true,
      attributes,
    }));
    this.defaultVariant = 0;
    this.error.set("");
    this.message.set(
      `${this.variants.length} variants generated. Review their prices and stock before saving.`,
    );
  }
  variantSummary(variant: SkuDraft) {
    return variant.attributes
      .map((attribute) => `${attribute.name}: ${attribute.values.join(", ")}`)
      .join(" · ");
  }
  totalStock() {
    return this.variants.reduce(
      (total, variant) => total + (Number(variant.quantity) || 0),
      0,
    );
  }
  applyBulk() {
    const value = Number(this.bulkValue);
    const updated = this.variants.map((variant) => {
      const original =
        this.bulkField === "price" ? variant.price : variant.quantity;
      const next =
        this.bulkMode === "INCREASE"
          ? original + value
          : this.bulkMode === "PERCENTAGE"
            ? original * (1 + value / 100)
            : value;
      return this.bulkField === "price"
        ? { ...variant, price: Math.round(next * 100) / 100 }
        : { ...variant, quantity: next };
    });
    if (
      !Number.isFinite(value) ||
      updated.some((variant) =>
        this.bulkField === "price"
          ? !Number.isFinite(variant.price) || variant.price <= 0
          : !Number.isInteger(variant.quantity) || variant.quantity < 0,
      )
    ) {
      this.error.set(
        "Enter a positive price or a non-negative whole stock quantity.",
      );
      return;
    }
    this.variants = updated;
    this.error.set("");
  }
  removeGeneratorValue(index: number, value: string) {
    const attribute = this.variantAttributes[index];
    attribute.input = this.splitValues(attribute.input)
      .filter((item) => item !== value)
      .join(", ");
  }
  save() {
    if (this.busy()) return;
    this.syncSingleVariant();
    const problem = this.validate();
    if (problem) {
      this.error.set(problem);
      return;
    }
    const skus = this.skuPayload();
    const fields = {
      name: this.name.trim(),
      description: this.description.trim(),
      is_active: this.active,
      sub_category_id: this.subCategoryId,
      skus,
    };
    if (this.id) {
      this.run(this.api.updateProduct(this.id, fields, this.files), () => {
        void this.router.navigate(["/admin/products/view", this.id]);
      });
      return;
    }
    this.run(this.api.createProduct(fields, this.files), () => {
      void this.router.navigateByUrl("/admin/products");
    });
  }
  private validate() {
    if (!this.name.trim()) return "Product name is required.";
    if (!this.description.trim()) return "Description is required.";
    if (!this.id && !this.categoryId) return "Please choose a category.";
    if (!this.subCategoryId) return "Please choose a sub-category.";
    if (
      !Number.isInteger(Number(this.lowStockThreshold)) ||
      Number(this.lowStockThreshold) < 0
    )
      return "Low stock threshold must be a non-negative whole number.";
    if (!this.id && !this.files.length)
      return "Please upload at least one product image.";
    if (this.defaultVariant < 0 || this.defaultVariant >= this.variants.length)
      return "Choose one default SKU.";
    const invalid = this.variants.find((variant) => {
      return (
        !variant.description.trim() ||
        !Number.isFinite(Number(variant.price)) ||
        !(Number(variant.price) > 0) ||
        !Number.isInteger(Number(variant.quantity)) ||
        Number(variant.quantity) < 0
      );
    });
    if (invalid)
      return "Each SKU needs a description, price, and whole quantity.";
    const invalidAttribute = this.variants.find((variant) => {
      if (!variant.useAttributes) return false;
      return variant.attributes.some((attribute) => {
        return (
          !attribute.name.trim() ||
          attribute.values.some((value) => !value.trim())
        );
      });
    });
    if (invalidAttribute)
      return "Fill in every enabled product attribute name and value, or turn the switch off.";
    return "";
  }
  private skuPayload() {
    return this.variants.map((variant, index) => {
      const attributes = variant.useAttributes
        ? variant.attributes.map((attribute) => ({
            id: null,
            name: attribute.name.trim(),
            attributes: attribute.values
              .map((value) => value.trim())
              .filter(Boolean)
              .map((value) => ({ id: null, value })),
          }))
        : [];
      const row: Row = {
        description: variant.description.trim(),
        price: Number(variant.price),
        quantity: Number(variant.quantity),
        low_stock_threshold: Number(this.lowStockThreshold),
        is_default: index === this.defaultVariant,
        operatorProductAttribute: variant.useAttributes,
        product_attributes: attributes,
        inventory: {
          quantity: Number(variant.quantity),
          lowStockThreshold: Number(this.lowStockThreshold),
          warehouse_location: variant.warehouse.trim() || undefined,
        },
      };
      if (variant.productSkuId) row["productSkuId"] = variant.productSkuId;
      if (variant.barcode.trim()) row["barcode"] = variant.barcode.trim();
      return row;
    });
  }
}
@Component({
  imports: [Status, RouterLink, ProductImage],
  templateUrl: "./product-detail.html",
  styleUrl: "./reference.css",
})
export class ProductDetailPage extends PageState {
  tab = "Overview";
  selectedImage = 0;
  tabs = [
    "Overview",
    "Variants",
    "Inventory",
    "Images",
    "Attributes",
    "Reviews",
    "Orders",
    "Promotions",
    "Activity Log",
  ];
  totalStock(row: Row) {
    return this.skus(row).reduce(
      (sum, sku) => sum + Number(stock({ skus: [sku] }) || 0),
      0,
    );
  }
  price(row: Row) {
    return skuPrice(row);
  }
  salePrice(row: Row) {
    const sku = firstSku(row);
    return sku ? field(sku, "finalPrice", "price") : undefined;
  }
  stockOf(sku: Row) {
    return stock({ skus: [sku] });
  }
  deleteProduct(row: Row) {
    if (!confirm("Delete this product?")) return;
    this.run(this.api.deleteProduct(Number(row["id"])), () => {
      this.row.set(null);
      this.message.set("Product deleted.");
    });
  }

  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  row = signal<Row | null>(null);
  field = field;
  text = text;
  usd = usd;
  when = when;
  imagesOf = imagesOf;
  categoryOf = categoryOf;
  brandOf = brandOf;
  warehouseOf = warehouseOf;
  attrsOf = attrsOf;
  attrText = attrText;
  constructor() {
    super();
    this.route.paramMap.subscribe((params) =>
      this.run(
        this.api.product(Number(params.get("id"))).pipe(
          switchMap((row) => {
            const id = Number(
              field(row, "subcategoryId", "SubcategoryId", "sub_category_id"),
            );
            return id
              ? this.api.brand(id).pipe(
                  map((brand) => ({
                    ...row,
                    brand: field(brand, "name"),
                    category: field(brand, "category_name", "categoryName"),
                  })),
                  catchError(() => of(row)),
                )
              : of(row);
          }),
        ),
        (row) => this.row.set(row),
      ),
    );
  }
  skus(row: Row) {
    return Array.isArray(row["skus"]) ? (row["skus"] as Row[]) : [];
  }
  activeRow(row: Row) {
    return field(row, "is_active") !== false;
  }
}
