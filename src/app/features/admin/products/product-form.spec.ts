import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap, Router } from "@angular/router";
import { of } from "rxjs";
import { AdminApi } from "../api/admin.api";
import { AiImportsApi } from "../imports/ai-imports.api";
import { ProductFormPage } from "./products.page";

describe("Dynamic product form", () => {
  let page: ProductFormPage;
  let create: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    create = vi.fn(() => of({ id: 10 }));
    TestBed.configureTestingModule({
      providers: [
        {provide:AiImportsApi,useValue:{reviewerOptions:()=>of({reviewers:[],defaultReviewerId:null}),stageProduct:create,action:()=>of({id:"request",revision:2,status:"SUBMITTED"})}},
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({})) },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: vi.fn(), navigate: vi.fn() },
        },
        {
          provide: AdminApi,
          useValue: {
            allCategories: () =>
              of([
                { id: 1, name: "Shoes" },
                { id: 2, name: "Electronics" },
              ]),
            allBrands: () =>
              of([
                { id: 5, name: "Nike", categoryId: 1 },
                { id: 6, name: "Sony", categoryId: 2 },
              ]),
            createProduct: create,
          },
        },
      ],
    });
    page = TestBed.runInInjectionContext(() => new ProductFormPage());
    page.ngOnInit();
    page.reviewerId=2;
  });

  it("generates Cartesian variants and saves one default SKU with actual attribute payloads", () => {
    page.name = "Air Max";
    page.description = "Running shoes";
    page.categoryId = 1;
    page.subCategoryId = 5;
    page.basePrice = 120;
    page.baseQuantity = 10;
    page.lowStockThreshold = 7;
    page.setHasVariants(true);
    page.variantAttributes = [
      { name: "Size", input: "S, M, L, S" },
      { name: "Color", input: "Black, White" },
    ];
    page.generateVariants();
    expect(page.variants).toHaveLength(6);
    expect(page.totalStock()).toBe(60);
    page.defaultVariant = 3;
    page.files = [new File(["image"], "shoe.jpg", { type: "image/jpeg" })];
    page.save();
    const fields = create.mock.calls[0][0];
    expect(
      fields.skus.filter((sku: { is_default: boolean }) => sku.is_default),
    ).toHaveLength(1);
    expect(fields.skus[3].is_default).toBe(true);
    expect(fields.skus[0].product_attributes).toEqual([
      { id: null, name: "Size", attributes: [{ id: null, value: "S" }] },
      { id: null, name: "Color", attributes: [{ id: null, value: "Black" }] },
    ]);
    expect(fields.skus[0].inventory.lowStockThreshold).toBe(7);
  });

  it("clears the previous brand when its category changes", () => {
    page.setCategory(1);
    page.subCategoryId = 5;
    page.setCategory(2);
    expect(page.subCategoryId).toBe(0);
    expect(page.brandChoices().map((row) => row["id"])).toEqual([6]);
  });

  it("saves edits made directly in the reference SKU card without resetting its price or stock", () => {
    page.name = "Programming laptop";
    page.description = "16 GB RAM";
    page.setCategory(2);
    page.subCategoryId = 6;
    page.variants[0].description = "Silver - 512GB";
    page.updateSku(0, "price", "649.99");
    page.updateSku(0, "quantity", "12");
    page.updateSku(0, "warehouse", "Phnom Penh");
    page.files = [new File(["image"], "laptop.jpg", { type: "image/jpeg" })];
    page.save();
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].skus[0]).toMatchObject({
      price: 649.99,
      quantity: 12,
      is_default: true,
      inventory: { quantity: 12, warehouse_location: "Phnom Penh" },
    });
  });

  it("keeps exactly one default SKU after removing an earlier row", () => {
    page.addVariant();
    page.addVariant();
    page.defaultVariant = 2;
    const selected = page.variants[2];
    page.removeVariant(0);
    expect(page.variants[page.defaultVariant]).toBe(selected);
    page.removeVariant(1);
    expect(page.defaultVariant).toBe(0);
    expect(page.variants).toHaveLength(1);
  });

  it("rejects excessive variant combinations and invalid bulk stock", () => {
    page.setHasVariants(true);
    page.variantAttributes = [
      {
        name: "Size",
        input: Array.from({ length: 101 }, (_, i) => String(i)).join(","),
      },
    ];
    page.generateVariants();
    expect(page.error()).toContain("50");
    expect(page.variants).toHaveLength(1);
    page.bulkField = "quantity";
    page.bulkValue = 1.5;
    page.applyBulk();
    expect(page.variants[0].quantity).toBe(1);
  });

  it("keeps image files and previews in the same order when changing the primary image", () => {
    const a = new File(["a"], "a.png", { type: "image/png" });
    const b = new File(["b"], "b.png", { type: "image/png" });
    page.files = [a, b];
    page.previews.set(["first-preview", "second-preview"]);
    page.makePrimary(1);
    expect(page.files).toEqual([b, a]);
    expect(page.previews()).toEqual(["second-preview", "first-preview"]);
  });
  it("removes attribute chips and applies fixed and percentage bulk increases", () => {
    page.variantAttributes = [{ name: "Size", input: "S, M, L" }];
    page.removeGeneratorValue(0, "M");
    expect(page.variantAttributes[0].input).toBe("S, L");
    page.variants[0].price = 120;
    page.bulkField = "price";
    page.bulkMode = "INCREASE";
    page.bulkValue = 5;
    page.applyBulk();
    expect(page.variants[0].price).toBe(125);
    page.bulkMode = "PERCENTAGE";
    page.bulkValue = 10;
    page.applyBulk();
    expect(page.variants[0].price).toBe(137.5);
    page.bulkField = "quantity";
    page.bulkValue = 50;
    page.applyBulk();
    expect(page.error()).toContain("whole stock");
    expect(page.variants[0].quantity).toBe(1);
  });
  it('loads the saved independent reviewer default and actual names for the selector',()=>{
    vi.spyOn(TestBed.inject(AiImportsApi),'reviewerOptions').mockReturnValue(of({reviewers:[{id:42,name:'Jane Reviewer',username:'jane'}],defaultReviewerId:42}));
    const form=TestBed.runInInjectionContext(()=>new ProductFormPage());form.ngOnInit();
    expect(form.reviewerId).toBe(42);expect(form.reviewerOptions()).toEqual([{value:42,label:'Jane Reviewer (@jane)'}]);
  });
});
