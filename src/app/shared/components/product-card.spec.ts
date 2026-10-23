import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ProductCard } from "./product-card";
import { AuthService } from "../../core/auth/auth.service";
import { Product } from "../../core/api/models";

const product: Product = {
  id: 10,
  name: "Test Phone",
  description: "Test fixture",
  main_image: [],
  is_active: true,
  skus: [
    { id: 21, sku: "FIRST", price: 100, quantity: 3 },
    {
      id: 22,
      sku: "DEFAULT",
      price: 200,
      finalPrice: 180,
      quantity: 2,
      is_default: true,
    },
  ],
};

describe("Product card UI integration", () => {
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).accept({
      id: 7,
      username: "test",
      email: "test@example.test",
      role: "USER",
      access_token: "access",
      refresh_token: "refresh",
    });
  });
  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it("shows the same default SKU and price that the cart request uses", () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput("product", product);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector(".product-option")?.textContent).toContain(
      "DEFAULT",
    );
    expect(
      element.querySelector(".product-price strong")?.textContent,
    ).toContain("180.00");
    (element.querySelector("button.primary") as HTMLButtonElement).click();
    fixture.detectChanges();
    const request = http.expectOne("/api/v1/cart/user/id/items?userId=7");
    expect(request.request.body).toEqual({ product_id: 22, quantity: 1 });
    request.flush({
      code: "200",
      data: { id: 1, total_items: 1, total_price: 180, items: [] },
    });
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      "Added to cart",
    );
  });

  it("disables unavailable products and does not submit a cart request", () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput("product", {
      ...product,
      skus: [{ ...product.skus[1], quantity: 0 }],
    });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      "button.primary",
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    http.expectNone("/api/v1/cart/user/id/items?userId=7");
  });

  it("uses available stock rather than reserved units and blocks adding them", () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput("product", {
      ...product, skus: [{ ...product.skus[1], quantity: 10,
        inventory: { stock_qty: 10, reserved_qty: 10, available_qty: 0 } }],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.product-stock').textContent).toContain('Out of Stock');
    expect(fixture.nativeElement.querySelector('button.primary').disabled).toBe(true);
    fixture.componentInstance.add();
    http.expectNone('/api/v1/cart/user/id/items?userId=7');
  });

  it("shows promotion name and original price when price already contains the discount", () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput("product", {
      ...product, skus: [{ ...product.skus[1], price: 180, originalPrice: 200, finalPrice: 180,
        promotion: { originalPrice: 200, finalPrice: 180, promotionApplied: true, promotionName: 'Weekend offer' } }],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.discount').textContent).toContain('10%');
    expect(fixture.nativeElement.querySelector('del').textContent).toContain('200.00');
    expect(fixture.nativeElement.querySelector('.product-promotion').textContent).toContain('Weekend offer');
  });

  it("shows request failure without displaying a cart success message", () => {
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput("product", product);
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector("button.primary") as HTMLButtonElement
    ).click();
    http
      .expectOne("/api/v1/cart/user/id/items?userId=7")
      .flush(
        { message: "Stock is unavailable" },
        { status: 409, statusText: "Conflict" },
      );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Stock is unavailable");
    expect(fixture.nativeElement.textContent).not.toContain("Added to cart");
  });
});
