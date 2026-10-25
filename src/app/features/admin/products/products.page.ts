import { ProductInputPatch } from './product-form-assistance';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AiImportsApi } from '../imports/ai-imports.api';
import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { PermissionService } from "../../../core/auth/permission.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { ProductImage } from "../../../shared/components/product-image";
import { ProductSelect } from "./product-select";
import { ChangeDetectorRef, Component, computed, DestroyRef, effect, inject, input, OnDestroy, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin, switchMap, map, catchError, of } from "rxjs";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text, usd, when } from "../api/admin.api";
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
  selector: "app-admin-products-list",
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, Status, RouterLink, FormsModule, Icon, ProductImage],
  template: `@if (accessDenied()) { <app-page-access-denied /> } @else { <section>
    <div class="adm-page-head">
      <div>
        <h2>{{ "Products" | translate }}</h2>
        <p>Manage your product inventory and pricing.</p>
      </div>
      <div class="adm-head-actions">
        <a class="adm-btn adm-primary"  routerLink="/admin/products/add"
           *appCanRoute="'/admin/products/add'"><app-icon name="plus" /> {{ "Add product" | translate }}</a
        >
      </div>
    </div>
    <div class="adm-stats" style="margin-bottom:14px">
      <article class="adm-card stat">
        <span class="adm-ico grad-blue"><app-icon name="box" /></span
        ><span class="k">{{ "Total products" | translate }}</span><strong>{{ total() }}</strong>
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
          <option value="">{{ "All statuses" | translate }}</option>
          <option value="active">{{ "Active" | translate }}</option>
          <option value="inactive">{{ "Inactive" | translate }}</option>
        </select>
        <button class="adm-btn adm-primary" [disabled]="busy()">{{ "Search" | translate }}</button>
        @if (name || statusFilter()) {
          <button class="adm-btn" type="button" (click)="clearFilters()">
            {{ "Clear filters" | translate }}
          </button>
        }
      </form>
      <div class="adm-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ "Product" | translate }}</th>
              <th>SKU</th>
              <th>{{ "Category" | translate }}</th>
              <th>{{ "Brand" | translate }}</th>
              <th>{{ "Price" | translate }}</th>
              <th>{{ "Stock" | translate }}</th>
              <th>{{ "Status" | translate }}</th>
              <th>Created</th>
              <th>Updated</th>
              <th>{{ "Actions" | translate }}</th>
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
                    >{{ (activeRow(row) ? "Active" : "Inactive") | translate }}</span
                  >
                </td>
                <td>{{ when(field(row, "created_at", "createdAt")) }}</td>
                <td>{{ when(field(row, "updated_at", "updatedAt")) }}</td>
                <td class="adm-actions">
                  @if(embedded()){
                    <button type="button" class="adm-btn icon" aria-label="Explain product in call" (click)="openProduct.emit(Number(field(row,'id')))"><app-icon name="eye"/></button>
                  }@else{
                  <a
                    class="adm-btn icon"
                    [routerLink]="['/admin/products/view', field(row, 'id')]"
                    [attr.aria-label]='"View product" | translate'
                     *appCanRoute="['/admin/products/view', field(row, 'id')]"><app-icon name="eye"
                  /></a>
                  }
                  <a
                    class="adm-btn icon"
                    [routerLink]="['/admin/products/edit', field(row, 'id')]"
                     [attr.aria-label]='"Edit product" | translate'
                     *appCanRoute="['/admin/products/edit', field(row, 'id')]"><app-icon name="edit"
                  /></a>
                  <button
                    class="adm-btn icon"
                    type="button"
                    [attr.aria-label]="
                      activeRow(row) ? 'Deactivate product' : 'Activate product'
                    "
                    (click)="toggle(row)" [disabled]="true" title="Change status through Edit Product and independent approval"
                   *appCan="'PRODUCT_UPDATE'">
                    <app-icon [name]="activeRow(row) ? 'close' : 'check'" />
                  </button>
                  <button
                    class="adm-btn icon danger"
                    type="button"
                     aria-label="Delete product"
                    (click)="remove(row)" [disabled]="true" title="Product deletion approval is not available"
                   *appCan="'PRODUCT_DELETE'">
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
  </section> }`,
})
export class ProductsPage extends PageState {
  embedded=input(false);
  readonly Number=Number;
  openProduct=output<number>();
  private lifetime=inject(DestroyRef);
  access = inject(PermissionService);
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
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.lifetime)).subscribe((params) => {
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
    if (!this.access.has("PRODUCT_UPDATE")) return;
    const active = field(row, "is_active") === false;
    this.message.set("Open Edit Product and submit the status change for approval.");
  }
  remove(row: Row) {
    if (!this.access.has("PRODUCT_DELETE")) return;
    this.message.set("Deletion requires a registered approval operation and is currently unavailable.");
  }
  activeRow(row: Row) {
    const value = field(row, "is_active", "isActive", "status");
    if (value === true || String(value).toLowerCase() === "active") return true;
    if (value === false || String(value).toLowerCase() === "inactive") return false;
    return null;
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
  id?:number;
  valueIds?:(number|undefined)[];
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
  selector: "app-admin-product-form",
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, Status, RouterLink, FormsModule, Icon, ProductImage, ProductSelect],
  templateUrl: "./product-form.html",
  styleUrl: "./product-form.css",
})
export class ProductFormPage extends PageState implements OnDestroy {
  embedded = input(false);
  prefill = input<{name?:string;description?:string;price?:number|null;quantity?:number;warehouse?:string;skuDescription?:string;categoryName?:string} | null>(null);
  cancelled = output<void>();
  saved = output<{id:string;status:string}>();
  busyChanged = output<boolean>();
  private formDestroy = inject(DestroyRef);
  private formChange = inject(ChangeDetectorRef, {optional:true});
  private imports = inject(AiImportsApi);
  reviewerId:number|null=null;
  reviewerOptions=signal<{value:number;label:string}[]>([]);
  reviewerError=signal('');
  productVersion:number|null=null;
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
    effect(() => this.busyChanged.emit(this.busy()));
  }
  applyChatInput(patch:ProductInputPatch) {
    const changed:string[]=[],issues:string[]=[];
    if(this.busy() || !this.embedded() || this.id)return {changed,issues:['Wait until the create form is ready.']};
    for(const key of ['name','description'] as const) if(patch[key]!==undefined){this[key]=patch[key]!;changed.push(key);}
    if(patch.active!==undefined){this.active=patch.active;changed.push('status');}
    if(patch.category!==undefined){
      const matches=this.categoryOptions().filter(option=>option.label.toLowerCase()===patch.category!.toLowerCase());
      if(matches.length===1){this.setCategory(matches[0].value);changed.push('category');}else issues.push('Choose a matching category in the form; the name was not unique or was not found.');
    }
    if(patch.subcategory!==undefined){
      const matches=this.subCategoryOptions().filter(option=>option.label.toLowerCase()===patch.subcategory!.toLowerCase());
      if(this.categoryId && matches.length===1){this.subCategoryId=matches[0].value;changed.push('sub-category');}else issues.push('Choose a category and a matching sub-category in the form.');
    }
    if(patch.price!==undefined || patch.quantity!==undefined || patch.warehouse!==undefined || patch.skuDescription!==undefined){
      if(this.hasVariants || this.variants.length!==1)issues.push('This product has multiple variants. Set each SKU price, stock and warehouse in the form.');
      else {
        if(patch.skuDescription!==undefined){this.variants[0].description=patch.skuDescription;changed.push('SKU description');}
        if(patch.price!==undefined){this.basePrice=patch.price;changed.push('price');}
        if(patch.quantity!==undefined){this.baseQuantity=patch.quantity;changed.push('stock');}
        if(patch.warehouse!==undefined){this.baseWarehouse=patch.warehouse;changed.push('warehouse');}
        this.syncSingleVariant();
      }
    }
    this.formChange?.markForCheck();
    return {changed,issues};
  }
  missingChatFields() {
    return [!this.name.trim()?'product name':'',!this.description.trim()?'description':'',!this.categoryId?'category':'',!this.subCategoryId?'sub-category':'',!this.files.length?'product image':'',this.variants.some(variant=>!variant.description.trim())?'SKU descriptions':'',this.variants.some(variant=>!Number.isFinite(variant.price)||variant.price<=0)?'SKU prices':'',!this.reviewerId?'independent reviewer':''].filter(Boolean);
  }
  ngOnInit() {
    this.imports.reviewerOptions().pipe(takeUntilDestroyed(this.formDestroy)).subscribe({next:result=>{
      this.reviewerOptions.set(result.reviewers.map(user=>({value:user.id,label:user.name+(user.username?' (@'+user.username+')':'')})));
      if(this.reviewerId===null)this.reviewerId=result.defaultReviewerId;
      if(!result.defaultReviewerId)this.reviewerError.set("Set an active Reports to manager with review and approval permissions before submitting.");
    },error:()=>this.reviewerError.set('Could not load authorized reviewers. Refresh before submitting for approval.')});
    if (this.embedded()) {
      const draft=this.prefill();
      this.name=draft?.name || '';
      this.description=draft?.description || '';
      this.basePrice=draft?.price ?? 0;
      this.baseQuantity=draft?.quantity ?? 1;
      this.baseWarehouse=draft?.warehouse || '';
      this.syncSingleVariant();
      if(draft?.skuDescription)this.variants[0].description=draft.skuDescription;
    }
    this.route.paramMap.pipe(takeUntilDestroyed(this.formDestroy)).subscribe((params) => {
      this.id = this.embedded() ? 0 : Number(params.get("id") || 0);
      const duplicateId = this.embedded() ? 0 : Number(
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
            const categoryName=this.embedded()?this.prefill()?.categoryName:undefined;
            if(categoryName)this.applyChatInput({category:categoryName});
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
              attributes:variant.attributes.map(attribute=>({...attribute,id:undefined,valueIds:undefined})),
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
    const version=field(row,"version");this.productVersion=typeof version==='number'?version:null;
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
        id:Number(field(attribute,"id"))||undefined,
        valueIds:Array.isArray(values)?values.map((value:Row)=>Number(field(value,"id"))||undefined):[],
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
  categoryOptions() {
    return this.categories().map(row => ({ value: Number(field(row, "id")), label: String(field(row, "name")) }));
  }
  subCategoryOptions() {
    return this.brandChoices().map(row => ({ value: Number(field(row, "id")), label: String(field(row, "name")) }));
  }
  updateSku(index: number, key: "price" | "quantity" | "warehouse", value: string | number) {
    const variant = this.variants[index];
    if (key === "warehouse") variant.warehouse = String(value);
    else variant[key] = Number(value);
    if (index === 0) {
      this.basePrice = variant.price;
      this.baseQuantity = variant.quantity;
      this.baseWarehouse = variant.warehouse;
    }
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
    if(attribute.valueIds)attribute.valueIds=attribute.valueIds.filter((_,position)=>position!==valueIndex);
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
          !["image/png", "image/jpeg"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      this.error.set("Choose PNG or JPG images no larger than 5 MB.");
      return;
    }
    if (this.files.length + images.length > 4) {
      this.error.set("Upload up to 4 product images.");
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
    if (count > 50) {
      this.error.set(
        "Use fewer attribute values. Generate up to 50 variants at a time.",
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
    if(this.bulkField==='quantity'&&this.variants.some(variant=>!!variant.productSkuId)){this.error.set("Existing stock changes require an Inventory request.");return;}
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
  save(submit=true) {
    if (this.busy()) return;
    if(submit && (!this.reviewerId || !Number.isSafeInteger(this.reviewerId) || this.reviewerId<1)){this.error.set("Enter an independent reviewer user ID.");return;}
    if(this.id && this.productVersion===null){this.error.set("Reload the product version before preparing an update.");return;}
    this.syncSingleVariant();
    const problem = submit?this.validate():(!this.name.trim()||!this.subCategoryId?"Enter a name and subcategory to save a draft.":"");
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
    const staged=this.imports.stageProduct(fields,this.files,this.id||undefined,this.productVersion??undefined);
    this.run(submit?staged.pipe(switchMap(batch=>this.imports.action(batch,'submit',{reviewerId:this.reviewerId}))):staged,batch=>{
      if(this.embedded()) this.saved.emit({id:batch.id,status:batch.status});
      else void this.router.navigate(['/admin/my-requests'],{queryParams:{batch:batch.id}});
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
            id: attribute.id??null,
            name: attribute.name.trim(),
            attributes: attribute.values
              .map((value) => value.trim())
              .filter(Boolean)
              .map((value,index) => ({ id: attribute.valueIds?.[index]??null, value })),
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
      if (variant.productSkuId) {row["productSkuId"] = variant.productSkuId;delete row["inventory"];delete row["low_stock_threshold"];}
      if (variant.barcode.trim()) row["barcode"] = variant.barcode.trim();
      return row;
    });
  }
}
@Component({
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, Status, RouterLink, ProductImage, Icon],
  templateUrl: "./product-detail.html",
  styleUrls: ["../styles/details.css", "./product-detail.css"],
})
export class ProductDetailPage extends PageState {
  access = inject(PermissionService);
  selectedImage = signal(0);
  activeTab = signal('Variants (SKUs)');
  readonly detailTabs = ['Variants (SKUs)', 'Attributes', 'Inventory', 'History'];
  skuImage(sku: Row, product: Row) { return String(field(sku, 'image', 'image_url', 'imageUrl') || imagesOf(sku)[0] || imagesOf(product)[0] || ''); }
  inventoryRows(product: Row) {
    return this.skus(product).map(sku => {
      const inventory = sku['inventory'] && typeof sku['inventory'] === 'object' ? sku['inventory'] as Row : sku;
      return { warehouse: warehouseOf(sku), stock: field(inventory, 'stock_qty', 'stockQty', 'quantity'), reserved: field(inventory, 'reserved_qty', 'reservedQty', 'reserved'), available: field(inventory, 'available_qty', 'availableQty', 'available') };
    });
  }
  attributeRows(product: Row) {
    const attributes = new Map<string, Set<string>>();
    for (const sku of this.skus(product)) for (const attr of attrsOf(sku)) {
      const name = String(attr['name'] || 'Attribute');
      if (!attributes.has(name)) attributes.set(name, new Set());
      for (const value of attrText(attr).split(',').map(value => value.trim()).filter(Boolean)) attributes.get(name)!.add(value);
    }
    return [...attributes].map(([name, values]) => ({ name, values: [...values] }));
  }
  stockOf(sku: Row) { return stock({ skus: [sku] }); }
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  row = signal<Row | null>(null);
  field = field;
  text = text;
  usd = usd;
  when = when;
  imagesOf = imagesOf;
  categoryOf(row: Row) {
    const value = categoryOf(row);
    return value && typeof value === 'object' ? field(value as Row, 'name') : value;
  }
  brandOf(row: Row) {
    const value = brandOf(row);
    return value && typeof value === 'object' ? field(value as Row, 'name') : value;
  }
  warehouseOf = warehouseOf;
  attrsOf = attrsOf;
  attrText = attrText;
  constructor() {
    super();
    this.route.paramMap.subscribe((params) => {
      this.row.set(null);
      this.selectedImage.set(0);
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
        (row) => this.row.set(row), true,
      );
    });
  }
  skus(row: Row) {
    return Array.isArray(row["skus"]) ? (row["skus"] as Row[]) : [];
  }
  activeRow(row: Row) {
    const value = field(row, "is_active", "isActive", "status");
    if (value === true || String(value).toLowerCase() === "active") return true;
    if (value === false || String(value).toLowerCase() === "inactive") return false;
    return null;
  }
}
