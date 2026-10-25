import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, DestroyRef, inject, input, output, signal, effect, untracked } from '@angular/core';
import { ChatOrder } from "../chat-order";
import { PaymentQr } from "../../payments/payment-qr";
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Address, Cart, CartItem, Order, Transaction } from '../../../core/api/models';
import { CustomerStore } from '../../../core/stores/customer.store';
import { CartApi } from '../../cart/cart.api';
import { AddressesApi } from '../../addresses/addresses.api';
import { OrdersApi } from '../../orders/orders.api';
import { PaymentsApi } from '../../payments/payments.api';
import { CheckoutAttempt } from '../../checkout/checkout-attempt';
import { Icon } from '../../../shared/components/icon';
import { ProductImage } from '../../../shared/components/product-image';
@Component({
    selector: 'app-chat-checkout',
    imports: [TranslatePipe, PaymentQr, ChatOrder, CurrencyPipe, FormsModule, RouterLink, Icon, ProductImage],
    templateUrl: './chat-checkout.html', styleUrl: './chat-checkout.css',
})
export class ChatCheckout {
    preferredMethod=input('');
    language=input('en');
    text(en:string,km:string){return this.language()==='km'?km:en;}
    labels = input<Record<number, {
        name: string;
        image: string;
    }>>({});
    navigate = output<void>();
    auth = inject(AuthService);
    private cartApi = inject(CartApi);
    private addressApi = inject(AddressesApi);
    private orders = inject(OrdersApi);
    private payments = inject(PaymentsApi);
    private attempt = inject(CheckoutAttempt);
    private store = inject(CustomerStore);
    private destroy = inject(DestroyRef);
    cart = signal<Cart | null>(null);
    addresses = signal<Address[]>([]);
    order = signal<Order | null>(null);
    transactions = signal<Transaction[]>([]);
    loading = signal(false);
    error = signal('');
    notice = signal('');
    reviewing = signal(false);
    pending = signal(false);
    paymentsLoaded = signal(false);
    trackingVisible = signal(false);
    addressId = 0;
    addingAddress=signal(false);
    addressDraft:Omit<Address,'id'>={address_line1:'',city:'',zip_code:'',country:'',is_default:false};
    saveAddress(){
        if(!this.auth.session()||this.loading()||this.checkoutLocked()||this.reviewing())return;
        const body={...this.addressDraft,address_line1:this.addressDraft.address_line1.trim(),city:this.addressDraft.city.trim(),zip_code:this.addressDraft.zip_code.trim(),country:this.addressDraft.country.trim(),is_default:this.addresses().length===0};
        if(!body.address_line1||!body.city||!body.zip_code||!body.country){this.error.set(this.text('Fill all delivery address fields.','សូមបំពេញព័ត៌មានអាសយដ្ឋានទាំងអស់។'));return;}
        this.loading.set(true);this.error.set('');
        this.addressApi.create(body).pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next:address=>{this.loading.set(false);if(!Number.isSafeInteger(address.id)||address.id<1){this.error.set('Address was not confirmed. Reload addresses before trying again.');return;}
                this.addresses.update(items=>[...items,address]);this.addressId=address.id;this.addingAddress.set(false);this.notice.set(this.text('Delivery address saved.','អាសយដ្ឋានដឹកជញ្ជូនត្រូវបានរក្សាទុក។'));},
            error:()=>{this.loading.set(false);this.error.set('Address could not be saved. Reload addresses before trying again.');}
        });
    }
    method = 'CASH_ON_DELIVERY';
    methods: string[] = [];
    private applyPreferredMethod(){
        if(this.pending()||this.reviewing()||this.order())return;
        const requested=this.preferredMethod();
        const method=requested==='BAKONG'&&this.methods.includes('KHQR')?'KHQR':requested;
        if(method&&this.methods.includes(method))this.method=method;
    }
    constructor() {
        effect(()=>{this.preferredMethod();untracked(()=>this.applyPreferredMethod());});
        if (this.auth.session()) {
            const saved = this.attempt.read(this.auth.userId());
            if (saved) {
                this.pending.set(true);
                this.addressId = saved.address_id;
                this.method = saved.payment_method;
            }
            this.load();
        }
    }
    load() {
        if (!this.auth.session() || this.loading() || this.order())
            return;
        this.loading.set(true);
        this.error.set('');
        this.reviewing.set(false);
        forkJoin({ cart: this.cartApi.current(), addresses: this.addressApi.list(), methods: this.payments.methods() })
            .pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next: data => {
                this.applyCart(data.cart);
                this.addresses.set(data.addresses);
                this.methods = data.methods.filter(method => ['BAKONG','KHQR','ABA','CASH_ON_DELIVERY'].includes(method));
                if (!this.pending() && !this.methods.includes(this.method)) this.method = this.methods[0] || '';
                if (!this.pending() && !data.addresses.some(a => a.id === this.addressId))
                    this.addressId = data.addresses.find(a => a.is_default)?.id || data.addresses[0]?.id || 0;
                this.applyPreferredMethod();
                this.loading.set(false);
            },
            error: () => { this.error.set('Could not load your cart and addresses. Please retry.'); this.loading.set(false); },
        });
    }
    private applyCart(cart: Cart) { this.cart.set(cart); this.store.cartCount.set(cart.total_items); }
    selectedAddress() { return this.addresses().find(a => a.id === Number(this.addressId)); }
    private checkoutLocked() {
        const saved = this.attempt.read(this.auth.userId());
        if (saved) {
            this.pending.set(true);
            this.addressId = saved.address_id;
            this.method = saved.payment_method;
        }
        return this.pending();
    }
    anotherOrder() {
        if (this.loading() || this.pending())
            return;
        this.order.set(null);
        this.transactions.set([]);
        this.paymentsLoaded.set(false);
        this.notice.set('');
        this.load();
    }
    change(item: CartItem, delta: number) {
        if (this.loading() || this.checkoutLocked() || this.reviewing() || this.order())
            return;
        const quantity = item.quantity + delta;
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999)
            return;
        this.loading.set(true);
        this.error.set('');
        this.cartApi.update(item.id, item.product_sku_id, quantity).pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next: cart => { this.applyCart(cart); this.loading.set(false); },
            error: () => { this.loading.set(false); this.error.set('Quantity could not be updated. Check stock and retry.'); },
        });
    }
    remove(item: CartItem) {
        if (this.loading() || this.checkoutLocked() || this.reviewing() || this.order())
            return;
        this.loading.set(true);
        this.error.set('');
        this.cartApi.remove(item.id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next: cart => { this.applyCart(cart); this.loading.set(false); },
            error: () => { this.loading.set(false); this.error.set('Item could not be removed. Please retry.'); },
        });
    }
    review() {
        if (this.loading() || this.checkoutLocked() || !this.selectedAddress() || !this.cart()?.items.length)
            return;
        this.loading.set(true);
        this.error.set('');
        this.notice.set('');
        this.cartApi.current().pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next: cart => { this.applyCart(cart); this.reviewing.set(cart.items.length > 0); this.loading.set(false); },
            error: () => { this.loading.set(false); this.error.set('Could not refresh your order total. Please retry.'); },
        });
    }
    edit() { if (!this.loading() && !this.pending())
        this.reviewing.set(false); }
    confirm() {
        if (!this.auth.session() || this.loading() || this.order())
            return;
        const saved = this.attempt.read(this.auth.userId());
        if (saved) {
            this.pending.set(true);
            this.place(saved);
            return;
        }
        if (!this.reviewing() || !this.selectedAddress() || !this.cart()?.items.length || !this.methods.includes(this.method))
            return;
        const reviewed = this.fingerprint(this.cart()!);
        this.loading.set(true);
        this.error.set('');
        // Reconcile the current cart before confirming: it may have changed in another tab.
        this.cartApi.current().pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next: cart => {
                this.applyCart(cart);
                if (reviewed !== this.fingerprint(cart)) {
                    this.reviewing.set(false);
                    this.loading.set(false);
                    this.notice.set('Your cart changed. Review the updated items and total before confirming.');
                    return;
                }
                const body = this.attempt.begin(this.auth.userId(), Number(this.addressId), this.method, 'USD', {expected_total:cart.total_price,reviewed_items:cart.items.map(item=>({skuId:item.product_sku_id,quantity:item.quantity}))});
                this.pending.set(true);
                this.place(body);
            },
            error: () => { this.loading.set(false); this.error.set('Could not verify your cart. No order was submitted.'); },
        });
    }
    private fingerprint(cart: Cart) {
        return JSON.stringify([cart.id, cart.total_price, cart.items.map(i => [i.id, i.product_sku_id, i.quantity, i.total_price]).sort((a, b) => a[0] - b[0])]);
    }
    private place(body: Parameters<OrdersApi['checkout']>[0]) {
        this.loading.set(true);
        this.error.set('');
        this.orders.checkout(body).pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next: order => {
                this.loading.set(false);
                if (order.status === 'CHECKOUT_PENDING') {
                    this.notice.set('Stock confirmation is pending. Use Check order again to resolve this same checkout.');
                    return;
                }
                if (order.status === 'FAILED' || order.status === 'CANCELLED') {
                    this.pending.set(false); this.reviewing.set(false); this.attempt.clear(this.auth.userId());
                    this.notice.set('Order could not be completed. Prices or stock changed; review your cart again.');
                    this.load(); return;
                }
                this.order.set(order);
                this.pending.set(false);
                this.reviewing.set(false);
                if(['BAKONG','KHQR','ABA'].includes(order.paymentMethod || body.payment_method))this.attempt.attachOrder(this.auth.userId(),order.id);
                else this.attempt.clear(this.auth.userId());
                this.store.cartCount.set(0);
                this.notice.set('Order received. Payment has not been taken in chat.');
            },
            error: () => {
                this.loading.set(false);
                this.error.set('The order result is not confirmed. Check this same order again; your checkout key is preserved to avoid duplicates.');
            },
        });
    }
    refreshPayments() {
        const order = this.order();
        if (!order || this.loading())
            return;
        this.loading.set(true);
        this.error.set('');
        this.payments.byOrder(order.id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next: records => { this.transactions.set(records); this.paymentsLoaded.set(true); this.loading.set(false); },
            error: () => { this.error.set('Could not verify payment status. Please retry.'); this.loading.set(false); },
        });
    }
}
