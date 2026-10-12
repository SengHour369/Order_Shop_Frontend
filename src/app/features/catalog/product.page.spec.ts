import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ProductPage } from './product.page';
import { CatalogApi } from './catalog.api';
import { CartApi } from '../cart/cart.api';
import { CustomerStore } from '../../core/stores/customer.store';
import { Product } from '../../core/api/models';

describe('Customer product details', () => {
  const product: Product = {
    id: 1, name: 'Wireless Headphones', description: 'Active noise cancellation.', is_active: true,
    main_image: ['/black.png'], skus: [
      { id: 10, sku: 'HEAD-BLK', price: 249.99, finalPrice: 179.99, quantity: 3, image_url: '/black.png', is_default: true,
        attributes: [{ id: 1, name: 'Color', attributes: [{ id: 1, value: 'True Black' }] }] },
      { id: 11, sku: 'HEAD-WHT', price: 199, quantity: 0, image_url: '/white.png' },
    ],
  };
  let add: ReturnType<typeof vi.fn>;
  let detail: ReturnType<typeof vi.fn>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(() => {
    add = vi.fn(() => of({ total_items: 2 }));
    detail = vi.fn(() => of(product));
    params = new BehaviorSubject(convertToParamMap({ id: 1 }));
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: CatalogApi, useValue: { detail } }, { provide: CartApi, useValue: { add } },
      { provide: CustomerStore, useValue: { has: () => false, toggle: () => true, cartCount: { set: vi.fn() } } },
    ] });
  });
  it('renders real variant labels and prices and switches gallery images', () => {
    const fixture = TestBed.createComponent(ProductPage); fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('True Black');
    expect(page.discount()).toBe(28);
    expect(page.images()).toEqual(['/black.png', '/white.png']);
    page.moveImage(-1); expect(page.currentImage()).toBe('/white.png');
    page.choose(product.skus[1]); expect(page.skuId()).toBe(11); expect(page.currentImage()).toBe('/white.png');
  });
  it('blocks invalid quantities and unavailable variants before contacting the cart API', () => {
    const page = TestBed.createComponent(ProductPage).componentInstance;
    for (const quantity of [0, -1, 1.5, 4, NaN]) { page.quantity = quantity; page.add(false); }
    page.choose(product.skus[1]); page.add(false);
    expect(add).not.toHaveBeenCalled();
    page.choose(product.skus[0]); page.product.set({ ...product, is_active: false }); page.add(false);
    expect(add).not.toHaveBeenCalled();
  });
  it('adds the selected SKU and navigates to checkout only after success', () => {
    const page = TestBed.createComponent(ProductPage).componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.quantity = 2; page.add(true);
    expect(add).toHaveBeenCalledWith(10, 2); expect(navigate).toHaveBeenCalledWith(['/checkout']);
  });
  it('keeps the customer on the product when adding to cart fails', () => {
    add.mockReturnValueOnce(throwError(() => new Error('Stock changed')));
    const page = TestBed.createComponent(ProductPage).componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate'); page.add(true);
    expect(page.error()).toBe('Stock changed'); expect(page.busy()).toBe(false); expect(navigate).not.toHaveBeenCalled();
  });
  it('loads a new product when the route changes and resets selection and quantity', () => {
    const page = TestBed.createComponent(ProductPage).componentInstance;
    page.quantity = 3; page.tab.set('reviews'); params.next(convertToParamMap({ id: 2 }));
    expect(detail).toHaveBeenLastCalledWith(2); expect(page.quantity).toBe(1); expect(page.tab()).toBe('details');
  });
  it('renders the specifications tab as two balanced tables using actual attribute values', () => {
    const fixture = TestBed.createComponent(ProductPage);
    const page = fixture.componentInstance;
    const attributes = Array.from({ length: 10 }, (_, index) => ({
      id: index, name: 'Attribute ' + index, attributes: [{ id: index, value: 'Value ' + index }],
    }));
    attributes.push({ id: 20, name: 'In the Box', attributes: [{ id: 21, value: 'Charging cable' }, { id: 22, value: 'Carrying case' }] });
    page.product.set({ ...product, skus: [{ ...product.skus[0], attributes }] });
    page.tab.set('specifications'); fixture.detectChanges();
    expect(page.optionLabel(page.selected()!)).toBe('HEAD-BLK');
    const tables = fixture.nativeElement.querySelectorAll('.specification-table');
    expect(tables).toHaveLength(2);
    expect(tables[0].querySelectorAll('tr')).toHaveLength(7);
    expect(tables[1].querySelectorAll('tr')).toHaveLength(6);
    expect(fixture.nativeElement.querySelectorAll('.specification-table li')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Charging cable');
    expect(fixture.nativeElement.textContent).not.toContain('40 hours');
    const toggle = fixture.nativeElement.querySelector('.specifications-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('tr.mobile-hidden')).toHaveLength(5);
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('tr.mobile-hidden')).toHaveLength(0);
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    page.choose(product.skus[1]); fixture.detectChanges();
    expect(page.specificationsExpanded()).toBe(false);
    expect(fixture.nativeElement.querySelector('.specifications-panel').textContent).not.toContain('Charging cable');
    expect(fixture.nativeElement.querySelector('.specifications-toggle')).toBeNull();
  });
  it('shows a specifications empty state when a product has no SKUs', () => {
    const fixture = TestBed.createComponent(ProductPage);
    fixture.componentInstance.product.set({ ...product, skus: [] });
    fixture.componentInstance.tab.set('specifications'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.specifications-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.specification-table')).toBeNull();
  });
});
