import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';

describe('Permission-driven routes', () => {
  const session = signal<any>({ id: 43, token_type: 'Cookie', role: 'USER' });
  const get = vi.fn();
  beforeEach(() => {
    session.set({ id: 43, token_type: 'Cookie', role: 'USER' });
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { session } },
      { provide: ApiClient, useValue: { get } },
    ] });
  });
  afterEach(() => TestBed.resetTestingModule());
  function access(permissions: string[], administrator = true) {
    get.mockReturnValue(of({ userId: 43, administrator, permissions }));
    const service = TestBed.inject(PermissionService);
    service.load(true).subscribe();
    return service;
  }
  it('keeps the admin chatbot menu and launcher available to live administrators',()=>{const service=access([],true);expect(service.allows('/admin/assistant')).toBe(true);expect(service.allowsMenu('/admin/assistant')).toBe(true);});
  it('hides the admin chatbot from non-administrators even with domain grants',()=>{const service=access(['PRODUCT_VIEW','ORDER_VIEW_ALL'],false);expect(service.allows('/admin/assistant')).toBe(false);expect(service.allowsMenu('/admin/assistant')).toBe(false);});
  it('shows granted group routes and rejects ungranted and unknown routes', () => {
    const service = access(['PRODUCT_VIEW']);
    expect(service.allows('/admin/products?search=phone')).toBe(true);
    expect(service.allows('/admin/products/view/1')).toBe(true);
    expect(service.allows('/admin/products/add')).toBe(false);
    expect(service.allows('/admin/products/edit/1')).toBe(false);
    expect(service.allows('/admin/inventory')).toBe(false);
    expect(service.allows('/admin/unknown')).toBe(false);
    expect(service.landingPath()).toBe('/admin/products');
  });
  it('shows menus only for configured group functions, including for administrator entry', () => {
    const service = access(['PRODUCT_VIEW']);
    expect(service.allowsMenu('/admin/products')).toBe(true);
    for (const path of ['/admin/returns', '/admin/inventory', '/admin/settings', '/admin/automation', '/admin/notifications']) {
      expect(service.allowsMenu(path)).toBe(false);
    }
  });
  it('shows AI Automation to verified administrators as a standalone menu entry',()=>{const service=access([],true);expect(service.allows('/admin/ai-automation')).toBe(true);expect(service.allowsMenu('/admin/ai-automation')).toBe(true);});
  it('hides AI Automation from nonadministrators',()=>{const service=access(['SYSTEM_TEST_VIEW'],false);expect(service.allows('/admin/ai-automation')).toBe(false);expect(service.allowsMenu('/admin/ai-automation')).toBe(false);});
  it('shows Settings for administrators with account management access', () => {
    const service = access(['USER_MANAGE']);
    expect(service.allows('/admin/settings')).toBe(true);
    expect(service.allowsMenu('/admin/settings')).toBe(true);
  });
  it('separates inventory viewing from stock changes', () => {
    const service = access(['INVENTORY_VIEW']);
    expect(service.allows('/admin/inventory')).toBe(true);
    expect(service.allows('/admin/inventory/stock-in')).toBe(false);
    expect(service.allows('/admin/inventory/adjustments')).toBe(false);
  });
  it('requires group update permission for edit routes', () => {
    const service = access(['USER_GROUP_VIEW']);
    expect(service.allows('/admin/groups/7')).toBe(true);
    expect(service.allows('/admin/groups/edit/7')).toBe(false);
  });
  it('removes routes when permissions change, fail to load, or the user signs out', () => {
    const service = access(['ORDER_VIEW_ALL']);
    expect(service.hasDashboard()).toBe(true);
    get.mockReturnValue(of({ userId: 43, administrator: true, permissions: ['IMPORT_UPLOAD'] }));
    service.load(true).subscribe();
    expect(service.allows('/admin/orders')).toBe(false);
    expect(service.landingPath()).toBe('/admin/my-requests');
    get.mockReturnValue(throwError(() => new Error('Offline')));
    service.load(true).subscribe();
    expect(service.allows('/admin/imports')).toBe(false);
    session.set(null);
    expect(service.allows('/admin')).toBe(false);
  });
});
