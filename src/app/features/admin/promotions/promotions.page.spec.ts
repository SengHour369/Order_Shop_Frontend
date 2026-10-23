import { PermissionService } from '../../../core/auth/permission.service';
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import {
  PromotionDraft,
  PromotionsPage,
  promotionError,
} from "./promotions.page";

const draft: PromotionDraft = {
  name: "Test promotion",
  code: "TEST",
  description: "",
  promotionType: "PRODUCT_DISCOUNT",
  discountType: "PERCENTAGE",
  discountValue: 20,
  maxDiscountAmount: null,
  minimumOrderAmount: null,
  startAt: "2026-10-10T09:00",
  endAt: "2026-10-11T09:00",
  priority: 1,
  usageLimit: null,
  usagePerCustomer: null,
  stackable: false,
};

describe("Promotion UI integration", () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]), { provide: PermissionService, useValue: { has: () => true, allows: () => true } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it("opens the list without the Create Promotion side panel", () => {
    const fixture = TestBed.createComponent(PromotionsPage);
    fixture.detectChanges();
    http.expectOne("/api/v1/admin/promotions?page=1&size=20").flush({
      code: "200", data: { content: [], totalElements: 0, totalPages: 1 },
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBe(false);
    expect(fixture.nativeElement.querySelector('form.reference-stack')).toBeNull();
    expect(fixture.nativeElement.querySelector('.reference-columns')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin/promotions/add"]')?.textContent).toContain('Create Promotion');
    expect(fixture.nativeElement.textContent).not.toContain('Open full form');
  });

  it('embeds the actual create form and saves only after a human submits it',()=>{
    const f=TestBed.createComponent(PromotionsPage);f.componentRef.setInput('embedded',true);f.detectChanges();
    expect(f.nativeElement.querySelector('form.reference-stack')).toBeTruthy();http.expectNone('/api/v1/admin/promotions');
    const saved=vi.fn();f.componentInstance.saved.subscribe(saved);f.componentInstance.draft={...draft};f.componentInstance.save();
    http.expectOne('/api/v1/admin/promotions').flush({code:'200',data:{id:8,...draft,status:'DRAFT'}});
    expect(saved).toHaveBeenCalledWith({id:8,status:'DRAFT'});http.expectNone('/api/v1/admin/promotions?page=1&size=20');
  });
  it("rejects discounts over 100 percent and invalid time ranges", () => {
    expect(promotionError({ ...draft, discountValue: 101 })).toContain("100");
    expect(promotionError({ ...draft, endAt: draft.startAt })).toContain(
      "end date",
    );
    expect(promotionError({ ...draft, usageLimit: 1.5 })).toContain(
      "whole numbers",
    );
    expect(promotionError(draft)).toBe("");
  });

  it("sends every editable field and disables stacking when saving", () => {
    const fixture = TestBed.createComponent(PromotionsPage);
    fixture.detectChanges();
    http.expectOne("/api/v1/admin/promotions?page=1&size=20").flush({
      code: "200",
      data: { content: [], totalElements: 0, totalPages: 0 },
    });
    fixture.componentInstance.create();
    fixture.componentInstance.draft = { ...draft };
    fixture.componentInstance.save();
    const create = http.expectOne("/api/v1/admin/promotions");
    expect(create.request.method).toBe("POST");
    expect(create.request.body).toEqual(draft);
    create.flush({
      code: "200",
      data: { ...draft, id: 8, status: "SCHEDULED" },
    });
    http.expectOne("/api/v1/admin/promotions?page=1&size=20").flush({
      code: "200",
      data: {
        content: [{ ...draft, id: 8 }],
        totalElements: 1,
        totalPages: 1,
      },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Promotion saved.");
    expect(fixture.nativeElement.textContent).toContain("Assigned SKU IDs");
  });

  it("renders numeric SKU assignments and sends unique IDs", () => {
    const fixture = TestBed.createComponent(PromotionsPage);
    fixture.detectChanges();
    http.expectOne("/api/v1/admin/promotions?page=1&size=20").flush({
      code: "200",
      data: { content: [], totalElements: 0, totalPages: 0 },
    });
    fixture.componentInstance.edit(8);
    http
      .expectOne("/api/v1/admin/promotions/8")
      .flush({ code: "200", data: { ...draft, id: 8, status: "ACTIVE" } });
    http.expectOne("/api/v1/admin/promotions/8/skus?page=1&size=20").flush({
      code: "200",
      data: { content: [42], totalElements: 1, totalPages: 1 },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("SKU #42");
    fixture.componentInstance.skuText = "42, 43, 42";
    fixture.componentInstance.assign();
    const assign = http.expectOne("/api/v1/admin/promotions/8/skus");
    expect(assign.request.body).toEqual({ skuIds: [42, 43] });
    assign.flush({ code: "200", data: null });
    http.expectOne("/api/v1/admin/promotions/8/skus?page=1&size=20").flush({
      code: "200",
      data: { content: [42, 43], totalElements: 2, totalPages: 1 },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("SKU #43");
  });

  it("keeps the saved promotion ID when SKU assignment fails so retry updates it", () => {
    const fixture = TestBed.createComponent(PromotionsPage);
    fixture.detectChanges();
    http.expectOne("/api/v1/admin/promotions?page=1&size=20").flush({
      code: "200",
      data: { content: [], totalElements: 0, totalPages: 0 },
    });
    const page = fixture.componentInstance;
    page.create();
    page.draft = { ...draft };
    page.selectedProducts = [{ product_sku_id: 42 }];
    page.save();
    http
      .expectOne("/api/v1/admin/promotions")
      .flush({ code: "200", data: { ...draft, id: 8, status: "DRAFT" } });
    http
      .expectOne("/api/v1/admin/promotions/8/skus")
      .flush(
        { message: "Assignment failed" },
        { status: 400, statusText: "Bad Request" },
      );
    expect(page.selectedId).toBe(8);
    page.save();
    const retry = http.expectOne("/api/v1/admin/promotions/8");
    expect(retry.request.method).toBe("PUT");
    retry.flush({ code: "200", data: { ...draft, id: 8, status: "DRAFT" } });
    http
      .expectOne("/api/v1/admin/promotions/8/skus")
      .flush({ code: "200", data: null });
    http
      .expectOne("/api/v1/admin/promotions/8/skus?page=1&size=20")
      .flush({
        code: "200",
        data: { content: [42], totalElements: 1, totalPages: 1 },
      });
    http.expectOne("/api/v1/admin/promotions?page=1&size=20").flush({
      code: "200",
      data: { content: [], totalElements: 0, totalPages: 0 },
    });
  });

  it("validates wizard progress and previews capped discounts without negative prices", () => {
    const fixture = TestBed.createComponent(PromotionsPage);
    fixture.detectChanges();
    http.expectOne("/api/v1/admin/promotions?page=1&size=20").flush({
      code: "200",
      data: { content: [], totalElements: 0, totalPages: 0 },
    });
    const page = fixture.componentInstance;
    page.create();
    page.nextStep();
    expect(page.step).toBe(0);
    page.draft = { ...draft };
    page.nextStep();
    expect(page.step).toBe(1);
    page.nextStep();
    expect(page.step).toBe(1);
    page.toggleProduct({ product_sku_id: 42 });
    page.nextStep();
    expect(page.step).toBe(2);
    expect(page.previewPrice(120)).toBe(96);
    page.draft.maxDiscountAmount = 10;
    expect(page.previewPrice(120)).toBe(110);
    page.draft.discountType = "FIXED_AMOUNT";
    page.draft.discountValue = 999;
    page.draft.maxDiscountAmount = null;
    expect(page.previewPrice(120)).toBe(0);
  });
});
