import { LanguageService } from '../../../core/i18n/language.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermissionService, requiredPermissions } from '../../../core/auth/permission.service';
import { AdminApi } from '../api/admin.api';
import { ProductsPage } from './products.page';

describe('Product action permissions in the rendered page', () => {
  const grants = signal<string[]>(['PRODUCT_VIEW']);
  const api = {
    products: vi.fn(() => of({ items: [{ id: 7, name: 'Visible product', is_active: true }], total: 1, pages: 1 })),
    deleteProduct: vi.fn(() => of({})), productStatus: vi.fn(() => of({})),
  };
  beforeEach(() => {
    grants.set(['PRODUCT_VIEW']);
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AdminApi, useValue: api },
      { provide: PermissionService, useValue: {
        has: (code: string) => grants().includes(code),
        allows: (url: string) => requiredPermissions(url).every(code => grants().includes(code)),
      } },
    ] });
    TestBed.inject(LanguageService).setLanguage('en');
  });
  afterEach(() => TestBed.resetTestingModule());
  it('keeps data and View visible while Create, Edit, Delete and status controls are absent', () => {
    const fixture = TestBed.createComponent(ProductsPage); fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Visible product');
    expect(el.querySelector('[aria-label="View product"]')).not.toBeNull();
    for (const label of ['Edit product', 'Delete product', 'Deactivate product']) {
      expect(el.querySelector(`[aria-label="${label}"]`)).toBeNull();
    }
    expect(el.querySelector('a[href="/admin/products/add"]')).toBeNull();
    fixture.componentInstance.remove({ id: 7 });
    fixture.componentInstance.toggle({ id: 7 });
    expect(api.deleteProduct).not.toHaveBeenCalled();
    expect(api.productStatus).not.toHaveBeenCalled();
  });
  it('adds and removes controls when current group grants change', () => {
    const fixture = TestBed.createComponent(ProductsPage); fixture.detectChanges();
    grants.set(['PRODUCT_VIEW', 'PRODUCT_DELETE']); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Delete product"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Edit product"]')).toBeNull();
    grants.set(['PRODUCT_VIEW', 'PRODUCT_UPDATE', 'PRODUCT_CREATE', 'IMPORT_UPLOAD']); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Delete product"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Edit product"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin/products/add"]')).not.toBeNull();
  });
});
