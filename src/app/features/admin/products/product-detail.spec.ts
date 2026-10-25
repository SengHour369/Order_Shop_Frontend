import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LanguageService } from '../../../core/i18n/language.service';
import { PermissionService } from '../../../core/auth/permission.service';
import { AdminApi } from '../api/admin.api';
import { ProductDetailPage } from './products.page';

describe('Product detail workspace', () => {
  const product = {id: 7, name: 'Running shoe', is_active: true, main_image: ['/front.png','/back.png'], skus: [{id: 8, sku: 'SHOE-42', price: 120, inventory: {quantity: 25, reserved_qty: 4, available_qty: 21, warehouse_location: 'Warehouse A'}, product_attributes: [{name: 'Size', attributes: [{value: '42'}]}]}]};
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter([]),
      {provide: ActivatedRoute, useValue: {paramMap: of(convertToParamMap({id: '7'}))}},
      {provide: AdminApi, useValue: {product: () => of(product)}},
      {provide: PermissionService, useValue: {has: () => true, allows: () => true}},
    ]});
    TestBed.inject(LanguageService).setLanguage('en');
  });
  afterEach(() => TestBed.resetTestingModule());
  it('renders product data and switches the selected gallery image', () => {
    const fixture = TestBed.createComponent(ProductDetailPage);fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('SHOE-42');
    expect(el.textContent).toContain('Warehouse A');
    (el.querySelector('[aria-label="View product image 2"]') as HTMLButtonElement).click();fixture.detectChanges();
    expect(el.querySelector('.hero-image')?.getAttribute('href')).toBe('/back.png');
    expect(el.querySelector('[aria-label="View product image 2"]')?.getAttribute('aria-pressed')).toBe('true');
  });
  it('switches panels and displays only supplied stock values', () => {
    const fixture = TestBed.createComponent(ProductDetailPage);fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const inventory = [...el.querySelectorAll<HTMLButtonElement>('.product-tabs button')].find(button => button.textContent==='Inventory')!;
    inventory.click();fixture.detectChanges();
    expect(el.querySelector('.variants-panel')).toBeNull();
    expect(el.querySelector('.product-lower-grid')?.textContent).toContain('21');
    expect(fixture.componentInstance.inventoryRows({skus:[{quantity:5}]})).toEqual([{warehouse:'',stock:5,reserved:'',available:''}]);
    expect(fixture.componentInstance.attributeRows(product)).toEqual([{name:'Size',values:['42']}]);
  });
});
