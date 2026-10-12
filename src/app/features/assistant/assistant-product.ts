import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartApi } from '../cart/cart.api';
import { CustomerStore } from '../../core/stores/customer.store';
import { ProductImage } from '../../shared/components/product-image';
import { Icon } from '../../shared/components/icon';

export interface AssistantProduct {
  id: number; name: string; description: string; image: string;
  skuId: number | null; price: number | null; available: number | null; sku: string;
}
@Component({
  selector: 'app-assistant-product',
  imports: [TranslatePipe, CurrencyPipe, RouterLink, ProductImage, Icon],
  template: `<article class="ai-product">
    <a [routerLink]="['/shop', product().id]" class="image"><img appProductImage [src]="product().image" [alt]="product().name" loading="lazy" /></a>
    <a [routerLink]="['/shop', product().id]"><h3>{{ product().name }}</h3></a>
    <p class="description">{{ product().description || product().sku || 'View product details for specifications.' }}</p>
    <strong class="price">{{ product().price === null ? 'Price unavailable' : (product().price | currency:'USD') }}</strong>
    <p class="stock" [class.unavailable]="product().available === null || product().available! < 1"><app-icon [name]="product().available !== null && product().available! > 0 ? 'check' : 'box'" />{{ product().available === null ? 'Check availability' : product().available! > 0 ? 'In stock' : 'Out of stock' }}</p>
    <div class="actions"><a [routerLink]="['/shop', product().id]">{{ "View Details" | translate }}</a><button [attr.aria-label]='"Add to cart" | translate' [disabled]="busy() || !product().skuId || product().available === null || product().available! < 1" (click)="add()"><app-icon name="cart" /></button></div>
    @if (feedback()) { <p class="feedback" role="status">{{ feedback() }}</p> }
  </article>`,
  styles: [`:host{display:block;min-width:0}.ai-product{height:100%;border:1px solid #e3eaf6;border-radius:9px;background:#fff;padding:12px;color:#101647}a{text-decoration:none;color:inherit}.image{display:grid;place-items:center;height:145px;margin-bottom:10px;background:#fafbfd;border-radius:5px}.image img{width:100%;height:100%;object-fit:contain}h3{font-size:15px;line-height:1.4;margin:8px 0}.description{font-size:12px;color:#6c7ba5;line-height:1.65;height:60px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;margin:8px 0}.price{font-size:21px;display:block;margin-top:12px}.stock{font-size:12px;color:#00a66b;display:flex;gap:7px;align-items:center}.stock app-icon{width:14px;height:14px}.unavailable{color:#8b7495}.actions{display:flex;gap:8px;margin-top:10px}.actions a{border:1px solid #b5ccff;border-radius:5px;flex:1;padding:10px 4px;text-align:center;color:#06f;font-size:12px}.actions button{width:42px;display:grid;place-items:center;border:0;border-radius:5px;background:#06f;color:white;cursor:pointer}.actions button:disabled{background:#b9c9e2;cursor:default}app-icon{width:21px;height:21px}.feedback{font-size:11px;color:#526791;margin:7px 0 0}button:focus-visible,a:focus-visible{outline:2px solid #06f;outline-offset:3px}`]
})
export class AssistantProductCard {
  product = input.required<AssistantProduct>();
  private cart = inject(CartApi);
  private store = inject(CustomerStore);
  busy = signal(false);
  feedback = signal('');
  add() {
    const product = this.product();
    if (this.busy() || !product.skuId || product.available === null || product.available < 1) return;
    this.busy.set(true);
    this.cart.add(product.skuId).subscribe({
      next: cart => { this.store.cartCount.set(cart.total_items); this.feedback.set('Added to cart'); },
      error: () => { this.feedback.set('Could not add this item. Please try again.'); this.busy.set(false); },
      complete: () => this.busy.set(false)
    });
  }
}
