import { ProductImage } from "../../shared/product-image";
import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Icon } from "../../shared/icon";
import { FormsModule } from "@angular/forms";
import { forkJoin, switchMap, of, map, catchError, tap } from "rxjs";
import { AdminApi, PageResult, Row, text, when, field, usd } from "./admin.api";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";

export type PromotionDraft = {
  name: string;
  code: string;
  description: string;
  promotionType: "PRODUCT_DISCOUNT" | "FLASH_SALE" | "SEASONAL_SALE";
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount: number | null;
  minimumOrderAmount: number | null;
  startAt: string;
  endAt: string;
  priority: number;
  usageLimit: number | null;
  usagePerCustomer: number | null;
  stackable: false;
};

function emptyDraft(): PromotionDraft {
  return {
    name: "",
    code: "",
    description: "",
    promotionType: "PRODUCT_DISCOUNT",
    discountType: "PERCENTAGE",
    discountValue: 10,
    maxDiscountAmount: null,
    minimumOrderAmount: null,
    startAt: "",
    endAt: "",
    priority: 0,
    usageLimit: null,
    usagePerCustomer: null,
    stackable: false,
  };
}

/** Validate before a write, while keeping the backend authoritative. */
export function promotionError(draft: PromotionDraft): string {
  if (!draft.name.trim()) return "Enter a promotion name.";
  if (!Number.isFinite(draft.discountValue) || draft.discountValue <= 0)
    return "Discount must be greater than zero.";
  if (draft.discountType === "PERCENTAGE" && draft.discountValue > 100)
    return "Percentage discount cannot exceed 100.";
  if (
    !draft.startAt ||
    !draft.endAt ||
    !Number.isFinite(Date.parse(draft.startAt)) ||
    !Number.isFinite(Date.parse(draft.endAt)) ||
    draft.startAt >= draft.endAt
  )
    return "Choose an end date after the start date.";
  if (!Number.isInteger(draft.priority))
    return "Priority must be a whole number.";
  for (const value of [draft.maxDiscountAmount, draft.minimumOrderAmount]) {
    if (value !== null && (!Number.isFinite(value) || value < 0))
      return "Amount limits must be zero or greater.";
  }
  for (const value of [draft.usageLimit, draft.usagePerCustomer]) {
    if (value !== null && (!Number.isInteger(value) || value < 0))
      return "Usage limits must be whole numbers of zero or greater.";
  }
  return "";
}

@Component({
  imports: [FormsModule, Status, RouterLink, Icon, ProductImage],
  templateUrl: "./promotions.html",
  styleUrl: "./reference.css",
})
export class PromotionsPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute, { optional: true });
  private router = inject(Router, { optional: true });
  mode: "list" | "create" | "detail" = "list";
  step = 0;
  detailTab = "Overview";
  detail = signal<Row>({});
  query = "";
  typeFilter = "";
  from = "";
  to = "";
  dateFilters = false;
  productPicker = false;
  pickerRows = signal<Row[]>([]);
  pickerPage = 1;
  pickerPages = signal(1);
  assignedProducts = signal<Row[]>([]);
  selectedProducts: Row[] = [];
  copiedSkuIds: number[] = [];
  field = field;
  usd = usd;
  tabs = [
    "Overview",
    "Products",
    "Conditions",
    "Usage & Customers",
    "Analytics",
    "Activity Log",
  ];
  steps = ["Basic Information", "Products", "Conditions", "Preview"];

  rows = signal<Row[]>([]);
  pages = signal(1);
  total = signal(0);
  editing = signal(false);
  currentStatus = signal("");
  assigned = signal<PageResult<number>>({
    items: [],
    total: 0,
    pages: 1,
    page: 1,
  });
  statuses = ["DRAFT", "SCHEDULED", "ACTIVE", "DISABLED", "EXPIRED"];
  status = "";
  page = 1;
  selectedId = 0;
  skuPage = 1;
  skuText = "";
  draft = emptyDraft();
  text = text;
  when = when;
  constructor() {
    super();
    const path = this.route?.snapshot.routeConfig?.path || "";
    if (path === "promotions/add") {
      this.mode = "create";
      this.create();
    } else if (path === "promotions/:id") {
      this.mode = "detail";
      this.edit(Number(this.route?.snapshot.paramMap.get("id")));
    } else {
      this.load();
      this.create();
    }
  }
  load(message = "") {
    this.run(this.api.promotions(this.status, this.page), (result) => {
      this.rows.set(result.items);
      this.pages.set(result.pages);
      this.total.set(result.total);
      this.message.set(message);
    });
  }
  create() {
    this.selectedId = 0;
    this.draft = emptyDraft();
    this.step = 0;
    this.selectedProducts = [];
    this.copiedSkuIds = [];
    this.currentStatus.set("");
    this.assigned.set({ items: [], total: 0, pages: 1, page: 1 });
    this.error.set("");
    this.message.set("");
    this.editing.set(true);
  }
  edit(id: number) {
    this.selectedProducts = [];
    this.step = 0;
    this.run(
      forkJoin({
        row: this.api.promotion(id),
        skus: this.api.promotionSkus(id),
      }),
      (result) => {
        this.selectedId = id;
        this.skuPage = 1;
        this.skuText = "";
        this.apply(result.row);
        this.assigned.set(result.skus);
        this.editing.set(this.mode !== "detail");
        if (this.mode === "detail") this.hydrateAssigned();
      },
    );
  }
  private apply(row: Row) {
    const numberOrNull = (key: string) =>
      row[key] == null ? null : Number(row[key]);
    this.detail.set(row);
    this.currentStatus.set(String(row["status"] || ""));
    this.draft = {
      name: String(row["name"] || ""),
      code: String(row["code"] || ""),
      description: String(row["description"] || ""),
      promotionType: String(
        row["promotionType"],
      ) as PromotionDraft["promotionType"],
      discountType: String(
        row["discountType"],
      ) as PromotionDraft["discountType"],
      discountValue: Number(row["discountValue"]),
      maxDiscountAmount: numberOrNull("maxDiscountAmount"),
      minimumOrderAmount: numberOrNull("minimumOrderAmount"),
      startAt: String(row["startAt"] || "").slice(0, 16),
      endAt: String(row["endAt"] || "").slice(0, 16),
      priority: Number(row["priority"] || 0),
      usageLimit: numberOrNull("usageLimit"),
      usagePerCustomer: numberOrNull("usagePerCustomer"),
      stackable: false,
    };
  }
  save() {
    const error = promotionError(this.draft);
    if (error) {
      this.error.set(error);
      return;
    }
    const body = {
      ...this.draft,
      name: this.draft.name.trim(),
      code: this.draft.code.trim(),
      stackable: false,
    };
    const selected = [
      ...new Set([
        ...this.copiedSkuIds,
        ...this.selectedProducts.map((row) =>
          Number(field(row, "product_sku_id", "id")),
        ),
      ]),
    ];
    if (selected.some((id) => !Number.isSafeInteger(id) || id < 1)) {
      this.error.set("Choose valid product SKUs.");
      return;
    }
    this.run(
      this.api.savePromotion(body, this.selectedId || undefined).pipe(
        // Keep the created ID if a later assignment fails, so retry updates it.
        tap((row) => {
          this.selectedId = Number(row["id"]);
        }),
        switchMap((row) =>
          selected.length
            ? this.api.assignPromotionSkus(Number(row["id"]), selected).pipe(
                switchMap(() => this.api.promotionSkus(Number(row["id"]))),
                tap((result) => this.assigned.set(result)),
                map(() => row),
              )
            : of(row),
        ),
      ),
      (row) => {
        this.selectedId = Number(row["id"]);
        this.apply(row);
        this.load("Promotion saved.");
        if (this.mode === "create")
          void this.router?.navigate(["/admin/promotions", this.selectedId]);
      },
    );
  }
  visible() {
    return this.rows().filter(
      (row) =>
        (!this.query ||
          JSON.stringify([row["name"], row["code"], row["description"]])
            .toLowerCase()
            .includes(this.query.toLowerCase())) &&
        (!this.typeFilter || row["discountType"] === this.typeFilter) &&
        (!this.from || String(row["endAt"]) >= this.from) &&
        (!this.to || String(row["startAt"]).slice(0, 10) <= this.to),
    );
  }
  stats() {
    return [
      {
        label: "Total Promotions",
        value: this.total(),
        tone: "blue",
        icon: "tag",
        note: "Matching records",
      },
      ...["ACTIVE", "SCHEDULED", "EXPIRED"].map((status) => ({
        label: status[0] + status.slice(1).toLowerCase() + " Promotions",
        value: this.rows().filter((row) => row["status"] === status).length,
        tone:
          status === "ACTIVE"
            ? "green"
            : status === "EXPIRED"
              ? "red"
              : "violet",
        icon: "tag",
        note: "On this page",
      })),
    ];
  }
  badge(value: unknown) {
    return value === "ACTIVE"
      ? "complete"
      : value === "EXPIRED" || value === "DISABLED"
        ? "failed"
        : "processed";
  }
  nextStep() {
    if (
      this.step === 0 &&
      (!this.draft.name.trim() || promotionError(this.draft))
    ) {
      this.error.set(promotionError(this.draft));
      return;
    }
    if (this.step === 1 && !this.selectedId && !this.selectedProducts.length) {
      this.error.set("Select at least one product SKU.");
      return;
    }
    this.error.set("");
    this.step = Math.min(3, this.step + 1);
  }
  openPicker() {
    this.productPicker = true;
    this.loadPicker();
  }
  loadPicker() {
    this.run(
      this.api
        .inventory(this.pickerPage, 10)
        .pipe(
          switchMap((result) =>
            this.enrichProducts(result.items).pipe(
              map((items) => ({ ...result, items })),
            ),
          ),
        ),
      (result) => {
        this.pickerRows.set(result.items);
        this.pickerPages.set(result.pages);
      },
    );
  }
  private enrichProducts(rows: Row[]) {
    if (!rows.length) return of([] as Row[]);
    return forkJoin(
      rows.map((row) => {
        const productId = Number(row["product_id"]);
        if (!productId) return of(row);
        return this.api.product(productId).pipe(
          map((product) => {
            const skus = Array.isArray(product["skus"])
              ? (product["skus"] as Row[])
              : [];
            const sku = skus.find(
              (sku) => Number(sku["id"]) === Number(row["product_sku_id"]),
            );
            const images = product["main_image"];
            return {
              ...row,
              price: sku?.["originalPrice"] ?? sku?.["price"],
              image_url: Array.isArray(images) ? images[0] : "",
            };
          }),
          catchError(() => of(row)),
        );
      }),
    );
  }
  hydrateAssigned() {
    const ids = this.assigned().items;
    const inventory = ids.length
      ? forkJoin(
          ids.map((id) =>
            this.api
              .inventoryBySku(id)
              .pipe(catchError(() => of({ product_sku_id: id } as Row))),
          ),
        )
      : of([] as Row[]);
    this.run(
      inventory.pipe(switchMap((rows) => this.enrichProducts(rows))),
      (rows) => this.assignedProducts.set(rows),
    );
  }
  toggleProduct(row: Row) {
    const id = Number(field(row, "product_sku_id", "id"));
    const index = this.selectedProducts.findIndex(
      (p) => Number(field(p, "product_sku_id", "id")) === id,
    );
    if (index >= 0) {
      this.selectedProducts.splice(index, 1);
      this.copiedSkuIds = this.copiedSkuIds.filter((value) => value !== id);
    } else this.selectedProducts.push(row);
  }
  isSelected(row: Row) {
    return this.selectedProducts.some(
      (p) =>
        field(p, "product_sku_id", "id") === field(row, "product_sku_id", "id"),
    );
  }
  previewPrice(price: unknown) {
    const value = Number(price) || 0;
    const discount =
      this.draft.discountType === "PERCENTAGE"
        ? (value * this.draft.discountValue) / 100
        : this.draft.discountValue;
    return (
      Math.round(
        Math.max(
          0,
          value - Math.min(discount, this.draft.maxDiscountAmount ?? Infinity),
        ) * 100,
      ) / 100
    );
  }
  duplicate() {
    this.run(this.api.allPromotionSkus(this.selectedId), (ids) => {
      this.copiedSkuIds = ids;
      this.selectedProducts = ids.map(
        (id) =>
          this.assignedProducts().find(
            (row) => Number(row["product_sku_id"]) === id,
          ) || {
            product_sku_id: id,
            product_name: `SKU #${id}`,
            sku: `#${id}`,
          },
      );
      this.selectedId = 0;
      this.draft = {
        ...this.draft,
        name: this.draft.name + " (copy)",
        code: "",
      };
      this.currentStatus.set("");
      this.mode = "create";
      this.editing.set(true);
      this.message.set(
        `Copied ${ids.length} SKU assignments. Save to create the duplicate.`,
      );
    });
  }
  transition(action: "schedule" | "activate" | "disable") {
    if (
      action === "disable" &&
      !confirm("Disable this promotion? Its discounts will stop applying.")
    )
      return;
    this.run(this.api.promotionTransition(this.selectedId, action), (row) => {
      this.apply(row);
      this.load("Promotion updated.");
    });
  }
  archive(id: number) {
    if (!confirm("Archive this promotion? Its discounts will stop applying."))
      return;
    this.run(this.api.archivePromotion(id), () => {
      if (id === this.selectedId) this.editing.set(false);
      if (this.mode === "detail") {
        this.mode = "list";
        void this.router?.navigate(["/admin/promotions"]);
      }
      this.load();
    });
  }
  loadSkus() {
    this.run(
      this.api.promotionSkus(this.selectedId, this.skuPage),
      (result) => {
        this.assigned.set(result);
        if (this.mode === "detail") this.hydrateAssigned();
      },
    );
  }
  assign() {
    const ids = [
      ...new Set(this.skuText.split(",").map((value) => Number(value.trim()))),
    ];
    if (!ids.length || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
      this.error.set("Enter positive SKU IDs separated by commas.");
      return;
    }
    this.run(
      this.api
        .assignPromotionSkus(this.selectedId, ids)
        .pipe(switchMap(() => this.api.promotionSkus(this.selectedId, 1))),
      (result) => {
        this.skuPage = 1;
        this.assigned.set(result);
        this.skuText = "";
        this.message.set("SKUs assigned.");
      },
    );
  }
  removeSku(id: number) {
    if (!confirm(`Remove SKU #${id} from this promotion?`)) return;
    this.run(
      this.api
        .removePromotionSku(this.selectedId, id)
        .pipe(switchMap(() => this.api.promotionSkus(this.selectedId, 1))),
      (result) => {
        this.skuPage = 1;
        this.assigned.set(result);
        this.message.set("SKU removed.");
      },
    );
  }
}
