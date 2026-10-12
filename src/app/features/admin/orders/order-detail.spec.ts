import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { OrderDetailPage } from './orders.page';

describe('Order detail service composition', () => {
  function create(paymentFails = false) {
    const api = {
      order: vi.fn(() => of({ id: 42, customer_id: 7, shipping_address_id: 9, status: 'PENDING' })),
      orderItems: vi.fn(() => of([{ id: 2, quantity: 1 }])),
      customer: vi.fn(() => of({ id: 7, fullName: 'Test Customer', email: 'test@example.test' })),
      address: vi.fn(() => of({ id: 9, address_line1: 'Street 1', city: 'Phnom Penh', country: 'Cambodia' })),
      paymentByOrder: vi.fn(() => paymentFails ? throwError(() => new Error('Unavailable')) : of({ id: 55, status: 'PENDING', amount: 120 })),
    };
    TestBed.configureTestingModule({ providers: [
      { provide: AdminApi, useValue: api },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '42' })) } },
    ] });
    return { page: TestBed.runInInjectionContext(() => new OrderDetailPage()), api };
  }

  it('uses the actual order customer, address and order-payment identifiers', () => {
    const { page, api } = create();
    expect(api.customer).toHaveBeenCalledWith(7);
    expect(api.address).toHaveBeenCalledWith(9);
    expect(api.paymentByOrder).toHaveBeenCalledWith(42);
    expect(page.customerName(page.order()!)).toBe('Test Customer');
    expect(page.shippingAddress(page.order()!)).toBe('Street 1, Phnom Penh, Cambodia');
    expect(page.paymentField(page.order()!, 'id', 'payment_id')).toBe(55);
  });

  it('keeps the order and items visible when payment service fails', () => {
    const { page } = create(true);
    expect(page.order()?.['id']).toBe(42);
    expect(page.items()).toHaveLength(1);
    expect(page.message()).toContain('payment');
    expect(page.paidAmount(page.order()!)).toBe('');
  });

  it('does not present an unpaid amount as paid or an order id as payment id', () => {
    const { page } = create();
    expect(page.paidAmount(page.order()!)).toBe('');
    expect(page.paidAmount({ payment: { status: 'SUCCESS', amount: 120 } })).toBe(120);
    expect(page.paymentField({ id: 42 }, 'id', 'payment_id')).toBe('');
  });
});
