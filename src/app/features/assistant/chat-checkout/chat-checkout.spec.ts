import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatCheckout } from './chat-checkout';
import { AuthService } from '../../../core/auth/auth.service';
import { CheckoutAttempt } from '../../checkout/checkout-attempt';
import { Cart, Session } from '../../../core/api/models';
const cart: Cart = { id: 1, total_items: 1, total_price: 39, items: [{ id: 10, product_sku_id: 88, quantity: 1, total_price: 39 }] };
const cartUrl = '/api/v1/cart/user/id?userId=7';
const checkoutUrl = '/api/v1/orders/user/from-cart?userId=7';
describe('Checkout inside customer chat', () => {
    let http: HttpTestingController;
    let session: ReturnType<typeof signal<Session | null>>;
    beforeEach(() => {
        TestBed.resetTestingModule();
        sessionStorage.clear();
        session = signal<Session | null>({ id: 7, username: 'Buyer', email: 'buyer@example.com', role: 'CUSTOMER', access_token: 'test', refresh_token: 'test' });
        TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
                { provide: AuthService, useValue: { session, userId: () => session()!.id } }] });
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(async () => {
        for (const qr of http.match(r => /\/payments\/orders\/\d+\/qr$/.test(r.url)))
            qr.flush({ status: 'FAILED', amount: 39, currency: 'USD', expiresAt: new Date().toISOString() });
        await Promise.resolve();
        try { http.verify(); } finally { sessionStorage.clear(); TestBed.resetTestingModule(); }
    });
    function create() {
        const fixture = TestBed.createComponent(ChatCheckout);
        if (session()) {
            http.expectOne(cartUrl).flush({ data: cart });
            http.expectOne('/api/v1/addresses/user/7').flush([{ data: { id: 5, address_line1: 'Street 271', city: 'Phnom Penh', country: 'Cambodia', zip_code: '12000', is_default: true } }]);
        }
        fixture.detectChanges();
        return fixture;
    }
    function review(component: ChatCheckout) { component.review(); http.expectOne(cartUrl).flush({ data: cart }); }
    it('requires review and a confirmation click before submitting an order', () => {
        const fixture = create();
        const component = fixture.componentInstance;
        component.confirm();
        http.expectNone(checkoutUrl);
        expect(component.addressId).toBe(5);
        review(component);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Confirm & Place Order');
        http.expectNone(checkoutUrl);
        component.method = 'ABA';
        component.confirm();
        http.expectOne(cartUrl).flush({ data: cart });
        const request = http.expectOne(checkoutUrl);
        expect(request.request.body).toEqual({ address_id: 5, payment_method: 'ABA', currency: 'USD', checkout_key: expect.any(String) });
        component.confirm();
        http.expectNone(checkoutUrl);
        request.flush({ data: { id: 30, order_number: 'ORD-30', status: 'PENDING', total_amount: 39 } });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('ORD-30');
        expect(TestBed.inject(CheckoutAttempt).read(7)).toBeNull();
        http.expectNone(r => r.url.includes('/payment-transactions'));
    });
    it('preserves the checkout key after uncertain failure and retries the same order', () => {
        const component = create().componentInstance;
        review(component);
        component.confirm();
        http.expectOne(cartUrl).flush({ data: cart });
        const request = http.expectOne(checkoutUrl);
        const key = request.request.body.checkout_key;
        request.flush({}, { status: 503, statusText: 'Unavailable' });
        expect(component.pending()).toBe(true);
        component.change(cart.items[0], 1);
        http.expectNone(r => r.url.includes('/items/'));
        component.confirm();
        const retry = http.expectOne(checkoutUrl);
        expect(retry.request.body.checkout_key).toBe(key);
        http.expectNone(cartUrl);
        retry.flush({ data: { id: 30, order_number: 'ORD-30', status: 'CHECKOUT_PENDING', total_amount: 39 } });
        expect(component.order()).toBeNull();
        expect(component.pending()).toBe(true);
    });
    it('requires a fresh review if the cart changed before confirmation', () => {
        const component = create().componentInstance;
        review(component);
        component.confirm();
        http.expectOne(cartUrl).flush({ data: { ...cart, total_items: 2, total_price: 78, items: [{ ...cart.items[0], quantity: 2, total_price: 78 }] } });
        http.expectNone(checkoutUrl);
        expect(component.reviewing()).toBe(false);
        expect(component.notice()).toContain('cart changed');
        expect(TestBed.inject(CheckoutAttempt).read(7)).toBeNull();
    });
    it('updates quantities using the exact cart item and SKU then removes an item', () => {
        const component = create().componentInstance;
        component.change(cart.items[0], 1);
        const update = http.expectOne('/api/v1/cart/user/id/items/cartItemId?userId=7&cartItemId=10');
        expect(update.request.body).toEqual({ product_id: 88, quantity: 2 });
        update.flush({ data: { ...cart, total_items: 2, total_price: 78, items: [{ ...cart.items[0], quantity: 2, total_price: 78 }] } });
        expect(component.cart()?.total_price).toBe(78);
        component.remove(cart.items[0]);
        http.expectOne('/api/v1/cart/user/userId/items/cartItemId?userId=7&cartItemId=10').flush({ data: { ...cart, total_price: 0, total_items: 0, items: [] } });
        expect(component.cart()?.items).toHaveLength(0);
    });
    it('shows only verified payment records after a user requests a refresh', () => {
        const fixture = create();
        const component = fixture.componentInstance;
        component.order.set({ id: 30, order_number: 'ORD-30', status: 'PENDING', total_amount: 39, order_date: '', customer_id: 7, shipping_address_id: 5 });
        component.refreshPayments();
        http.expectOne('/api/v1/payment-transactions/order/30').flush({ data: [{ id: 2, transaction_no: 'PAY-2', status: 'PENDING', payment_method: 'ABA', amount: 39, currency: 'USD', order_id: 30 }] });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('only provider verification confirms payment');
        expect(fixture.nativeElement.textContent).toContain('PAY-2');
        expect(component.transactions()[0].status).toBe('PENDING');
    });
    it('recovers a pending checkout after the chat panel is recreated', () => {
        const saved = TestBed.inject(CheckoutAttempt).begin(7, 5, 'ABA', 'USD');
        const component = create().componentInstance;
        expect(component.pending()).toBe(true);
        component.confirm();
        const request = http.expectOne(checkoutUrl);
        expect(request.request.body).toEqual(saved);
        request.flush({}, { status: 503, statusText: 'Unavailable' });
    });
    it('asks guests to sign in without loading private cart or address data', () => {
        session.set(null);
        const fixture = create();
        fixture.componentInstance.confirm();
        expect(fixture.nativeElement.textContent).toContain('Sign in');
        http.expectNone(r => r.url.includes('/api/v1/'));
    });
});
