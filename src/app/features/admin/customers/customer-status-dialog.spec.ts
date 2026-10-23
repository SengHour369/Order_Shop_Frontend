import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermissionService } from '../../../core/auth/permission.service';
import { AdminApi } from '../api/admin.api';
import { CustomersPage } from './customers.page';

describe('Customer status confirmation UI', () => {
  const customer = { id: 7, full_name: 'Jane Smith', status: 'ACT' };
  let allowed: boolean;
  let api: { customers: ReturnType<typeof vi.fn>; customerStatus: ReturnType<typeof vi.fn> };
  const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  beforeEach(() => {
    allowed = true;
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true; } });
    api = { customers: vi.fn(() => of({ items: [customer] })), customerStatus: vi.fn(() => of({})) };
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AdminApi, useValue: api },
      { provide: PermissionService, useValue: { has: () => allowed, allows: () => allowed } },
    ] });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    if (original) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  });
  it('shows a named in-app confirmation and cancel makes no API request', () => {
    const fixture = TestBed.createComponent(CustomersPage); fixture.detectChanges();
    fixture.componentInstance.setStatus(customer); fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog');
    expect(dialog.textContent).toContain('Block customer?');
    expect(dialog.textContent).toContain('Jane Smith');
    expect(api.customerStatus).not.toHaveBeenCalled();
    dialog.querySelector('.cancel').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
    expect(api.customerStatus).not.toHaveBeenCalled();
  });
  it('blocks only after explicit confirmation and ignores duplicate confirmation', () => {
    const fixture = TestBed.createComponent(CustomersPage); fixture.detectChanges();
    fixture.componentInstance.setStatus(customer); fixture.detectChanges();
    fixture.nativeElement.querySelector('dialog .confirm').click(); fixture.detectChanges();
    fixture.componentInstance.confirmStatus(true);
    expect(api.customerStatus).toHaveBeenCalledExactlyOnceWith(7, 'BLK');
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
  });
  it('activates blocked customers and rechecks permissions before submitting', () => {
    const fixture = TestBed.createComponent(CustomersPage); fixture.detectChanges();
    fixture.componentInstance.setStatus({ ...customer, status: 'BLK' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').textContent).toContain('Activate customer?');
    allowed = false; fixture.componentInstance.confirmStatus(true);
    expect(api.customerStatus).not.toHaveBeenCalled();
    allowed = true; fixture.componentInstance.setStatus({ ...customer, status: 'BLK' });
    fixture.componentInstance.confirmStatus(true);
    expect(api.customerStatus).toHaveBeenCalledExactlyOnceWith(7, 'ACT');
  });
});
