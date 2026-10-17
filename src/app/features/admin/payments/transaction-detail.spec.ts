import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { AdminApi } from '../api/admin.api';
import { AuthService } from '../../../core/auth/auth.service';
import { TransactionDetailPage } from './transactions.page';

function setup() {
  const route = new Subject<ReturnType<typeof convertToParamMap>>();
  const api = {
    transaction: vi.fn(() => of({ id: 1, transaction_no: 'TX-1', order_id: 2, customer_id: 3, amount: 245, currency: 'USD', status: 'SUCCESS' })),
    order: vi.fn(() => of({ order_number: 'ORD-2', shipping_address_id: 4, items: [{ product_sku_id: 5, quantity: 2, unit_price: 10, total_price: 20 }] })),
    customer: vi.fn(() => of({ username: 'Michael', email: 'm@example.test' })),
    address: vi.fn(() => of({ address_line1: '123 Main Street', city: 'Phnom Penh', country: 'Cambodia' })),
    transactionStatusHistory: vi.fn(() => of([])),
    transactionStatus: vi.fn(() => of({ id: 1, status: 'PAID' })),
  };
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { paramMap: route } }, { provide: AdminApi, useValue: api }, { provide: AuthService, useValue: { session: signal({ username: 'admin' }) } }] });
  const page = TestBed.runInInjectionContext(() => new TransactionDetailPage());
  route.next(convertToParamMap({ id: '1' }));
  return { page, api, route };
}
describe('Transaction details', () => {
  it('loads linked order, customer and address records and uses actual item totals', () => {
    const { page, api } = setup();
    expect(api.order).toHaveBeenCalledWith(2); expect(api.customer).toHaveBeenCalledWith(3); expect(api.address).toHaveBeenCalledWith(4);
    expect(page.orderNumber()).toBe('ORD-2'); expect(page.customerName()).toBe('Michael'); expect(page.addressText()).toContain('123 Main Street'); expect(page.subtotal()).toBe(20);
    expect(page.money('')).toBe('—'); expect(page.statusLabel()).toBe('Successful');
  });
  it('keeps transaction visible when optional related records fail', () => {
    const { page, api } = setup();
    api.order.mockReturnValue(throwError(() => new Error('Unavailable')));
    api.transactionStatusHistory.mockReturnValue(throwError(() => new Error('Unavailable')));
    page.open(1);
    expect(page.row()?.['id']).toBe(1); expect(page.items()).toEqual([]); expect(page.historyUnavailable()).toBe(true); expect(page.error()).toBe('');
  });
  it('does not allow status updates without a reason', () => {
    const { page, api } = setup(); page.reason = '  '; page.save();
    expect(api.transactionStatus).not.toHaveBeenCalled(); expect(page.error()).toContain('reason');
    page.reason = 'Confirmed settlement'; page.next = 'PAID'; page.save();
    expect(api.transactionStatus).toHaveBeenCalledWith(1, 'PAID', 'admin', 'Confirmed settlement');
  });
});
