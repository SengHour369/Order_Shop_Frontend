import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
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
      paymentByOrder: vi.fn(() => paymentFails ? throwError(() => new Error('Unavailable')) : of({ id: 55, status: 'PENDING', amount: 120, payment_date: '2026-10-18T10:00:00' })),
    };
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: AdminApi, useValue: api },
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
  it('calculates pricing from per-unit discounts and quantities', () => {
    const { page } = create();
    page.items.set([{ baseUnitPrice: 30, unit_price: 25, discountAmount: 5, quantity: 3, total_price: 75 }]);
    expect(page.subtotal()).toBe(90);
    expect(page.discount()).toBe(15);
    expect(page.optionalDiscount(page.items()[0])).toBe('-$15.00');
    expect(page.optionalMoney('')).toBe('—');
    expect(page.optionalMoney(0)).toBe('$0.00');
  });

  it('renders the reference card layout and hides unavailable shipping fields', () => {
    create();
    const fixture = TestBed.createComponent(OrderDetailPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.order-overview > .admin-order-card')).toHaveLength(3);
    expect(element.querySelectorAll('.order-content > .admin-order-card')).toHaveLength(2);
    expect(element.querySelector('.customer-card')).not.toBeNull();
    expect(element.querySelector('.shipping-card')).not.toBeNull();
    expect(element.querySelector('.ordered-items')).not.toBeNull();
    expect(element.querySelector('.timeline-card')).not.toBeNull();
    expect(element.querySelector('.order-number')?.textContent).toContain('42');
    expect(element.textContent).not.toContain('Tracking No.');
    expect(element.textContent).not.toContain('Shipping Method');
    expect(element.textContent).not.toContain('Paid On');
    expect(element.textContent).toContain('Test Customer');
    expect(element.textContent).not.toContain('Sarah Johnson');
  });

  it('isolates the detail cards and discount cells from storefront layout classes', () => {
    create();
    const conflictingStyles = document.createElement('style');
    conflictingStyles.textContent = '.order-card { display: grid; grid-template-columns: 1fr 1fr 1fr; } .discount { position: absolute; } .total { display: flex; }';
    document.head.appendChild(conflictingStyles);
    try {
      const fixture = TestBed.createComponent(OrderDetailPage);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelectorAll('.order-card, .discount, .total')).toHaveLength(0);
      expect(root.querySelectorAll('.admin-order-card')).toHaveLength(5);
      expect(getComputedStyle(root.querySelector('.admin-order-card')!).display).toBe('block');
      expect(root.querySelector('.admin-order-discount')).not.toBeNull();
    } finally {
      conflictingStyles.remove();
    }
  });

  it('marks failed timeline events as failures rather than successful milestones', () => {
    const { page } = create();
    const events = page.timeline({ status: 'FAILED', order_date: '2026-10-18T10:00:00', updated_at: '2026-10-18T10:01:00' });
    expect(events[0].failed).toBe(false);
    expect(events[1].failed).toBe(true);
  });

  it('uses real payment and status history events without inventing shipping events', () => {
    const { page } = create();
    const pending = page.timeline({ status: 'PENDING', order_date: '2026-10-16T10:00:00' });
    expect(pending.map(event => event.label)).toEqual(['Order Placed']);
    const events = page.timeline({ order_date: '2026-10-16T10:00:00', status: 'SHIPPED', payment: { status: 'PAID', payment_date: '2026-10-16T10:01:00' }, status_history: [{ new_status: 'SHIPPED', changed_at: '2026-10-16T11:00:00' }] });
    expect(events.map(event => event.label)).toEqual(['Order Placed', 'Payment Successful', 'Shipped']);
    expect(events[2].shipping).toBe(true);
    expect(page.seller({})).toBeNull();
    expect(page.mapUrl({})).toBe('');
    expect(page.mapUrl(page.order()!)).toContain('Street%201');
  });
});
