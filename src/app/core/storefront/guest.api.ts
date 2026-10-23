import { inject, Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, shareReplay, switchMap, throwError } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { Cart, Envelope } from '../api/models';
import { unwrap } from '../api/response';

export interface GuestDelivery { fullName: string; phone: string; email: string; province: string; district: string; commune: string; village: string; streetHouse: string; notes: string; }
export interface GuestCheckout { delivery: GuestDelivery; idempotencyKey: string; paymentMethod: string; expectedTotal: number; }
export interface GuestOrder { id: number; orderNumber: string; status: string; totalAmount: number; currency: string; paymentMethod: string; createdAt: string; items: {skuId: number; quantity: number; total: number}[]; }
export interface GuestConfirmation { order: GuestOrder; orderAccessToken: string; accessExpiresAt: string; }
export interface GuestPayment { paymentAllowed?: boolean; status: string; paymentVerified: boolean; amount?: number; currency?: string; expiresAt?: string; qr?: string; transactionReference?: string; }
@Injectable({providedIn: 'root'})
export class GuestApi {
  private api = inject(ApiClient);
  private bootstrap?: Observable<{csrfToken: string; expiresAt: string}>;
  private session() {
    this.bootstrap ??= this.api.post<{csrfToken: string; expiresAt: string}>('/api/v1/guest/session').pipe(
      catchError(error => { this.bootstrap = undefined; return throwError(() => error); }), shareReplay({bufferSize: 1, refCount: false}));
    return this.bootstrap;
  }
  request<T>(method: string, path: string, body?: unknown, token?: string): Observable<T> {
    return this.session().pipe(switchMap(session => {
      if (Date.parse(session.expiresAt) <= Date.now()) {
        this.bootstrap = undefined;
        return throwError(() => new Error('Your guest session expired. Reload the page to start a new session.'));
      }
      let headers = new HttpHeaders({'X-Guest-CSRF': session.csrfToken});
      if (token) headers = headers.set('X-Guest-Order-Token', token);
      return this.api.http.request<T>(method, this.api.url('/api/v1/guest' + path), {body, headers});
    }));
  }
  cart() { return this.request<Envelope<Cart>>('GET', '/cart').pipe(map(unwrap)); }
  add(skuId: number, quantity: number) { return this.request<Envelope<Cart>>('POST', '/cart/items', {product_id: skuId, quantity}).pipe(map(unwrap)); }
  update(id: number, skuId: number, quantity: number) { return this.request<Envelope<Cart>>('PATCH', '/cart/items/' + id, {product_id: skuId, quantity}).pipe(map(unwrap)); }
  remove(id: number) { return this.request<Envelope<Cart>>('DELETE', '/cart/items/' + id).pipe(map(unwrap)); }
  clear() { return this.request<Envelope<Cart>>('DELETE', '/cart/items').pipe(map(unwrap)); }
  checkout(body: GuestCheckout) { return this.request<GuestConfirmation>('POST', '/orders', body); }
  preview(body: GuestCheckout) { return this.request<{total: number}>('POST', '/checkout/preview', body); }
  orders() { return this.request<GuestOrder[]>('GET', '/orders'); }
  access(id: number) { return this.request<GuestConfirmation>('POST', `/orders/${id}/access`); }
  order(id: number, token: string) { return this.request<GuestOrder>('GET', `/orders/${id}`, undefined, token); }
  payment(id: number, token: string) { return this.request<GuestPayment>('GET', `/orders/${id}/payment-status`, undefined, token); }
  paymentImage(id: number, token: string) {
    return this.session().pipe(switchMap(() => this.api.http.get(this.api.url(`/api/v1/guest/orders/${id}/payment-image`),
      {headers: {'X-Guest-Order-Token': token}, responseType: 'blob'})));
  }
  sendCode(email: string) { return this.request<void>('POST', '/contact/code', {email}); }
  verifyCode(email: string, code: string) { return this.request<void>('POST', '/contact/verify', {email, code}); }
}
