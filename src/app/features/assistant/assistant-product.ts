import { ChatProduct } from './customer-chat/chat-message';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartApi } from '../cart/cart.api';
import { CustomerStore } from '../../core/stores/customer.store';
import { ProductImage } from '../../shared/components/product-image';
import { Icon } from '../../shared/components/icon';

export interface AssistantProduct {
  id: number; name: string; description: string; image: string;
  detail?:ChatProduct;
  skuId: number | null; price: number | null; available: number | null; sku: string;
}
@Component({
  selector: 'app-assistant-product',
  imports: [FormsModule, TranslatePipe, CurrencyPipe, RouterLink, ProductImage, Icon],
  template: `<article class="ai-product">
    <a (click)="select($event)" [routerLink]="interactive()?null:administrator() ? ['/admin/products/view',product().id] : ['/shop', product().id]" class="image"><img appProductImage [src]="product().image" [alt]="product().name" loading="lazy" /></a>
    <a (click)="select($event)" [routerLink]="interactive()?null:administrator() ? ['/admin/products/view',product().id] : ['/shop', product().id]"><h3>{{ product().name }}</h3></a>
    <p class="description">{{ product().description || product().sku || 'View product details for specifications.' }}</p>
    <strong class="price">{{ product().price === null ? 'Price unavailable' : (product().price | currency:'USD') }}</strong>
    <p class="stock" [class.unavailable]="product().available === null || product().available! < 1"><app-icon [name]="product().available !== null && product().available! > 0 ? 'check' : 'box'" />{{ product().available === null ? 'Check availability' : product().available! > 0 ? 'In stock' : 'Out of stock' }}</p>
    @if(product().detail; as detail){
      @if(detail.brand){<small>Brand: {{detail.brand}}</small>}@if(detail.category){<small>{{detail.category}}</small>}
      @if(detail.productCode){<small>{{detail.productCode}}</small>}
      @if(expanded()){
        <p>{{detail.description}}</p>
        @for(attribute of detail.attributes || [];track attribute.name){<small>{{attribute.name}}: {{attribute.values.join(', ')}}</small>}
        @if(detail.originalPrice!==undefined && detail.price!==undefined && detail.originalPrice!>detail.price!){<del>{{detail.originalPrice | currency:(detail.currency || 'USD')}}</del>}
        @if(detail.promotion){<small>{{detail.promotion}}</small>}@if(detail.discount){<small>Discount: {{detail.discount | currency:(detail.currency || 'USD')}}</small>}
        @if(detail.promotionEndAt){<small>Valid until: {{detail.promotionEndAt}}</small>}
        <small>SKU stock: {{detail.available ?? 'Unavailable'}}</small>
        @if(detail.variants.length>1){<select aria-label="Select product variant" [ngModel]="detail.skuId" (ngModelChange)="variant($event)">@for(sku of detail.variants;track sku.id){<option [ngValue]="sku.id">{{sku.label}} · {{sku.available ?? 'Unavailable'}}</option>}</select>}
        <a [routerLink]="administrator()?['/admin/products/view',detail.id]:['/shop',detail.id]">View product</a>
      }
    }
    <div class="actions"><a (click)="select($event)" [routerLink]="interactive()?null:administrator() ? ['/admin/products/view',product().id] : ['/shop', product().id]">{{ (administrator()?"Manage product":"View Details") | translate }}</a>@if(!administrator()){<button [attr.aria-label]='"Add to cart" | translate' [disabled]="busy() || !product().skuId || product().available === null || product().available! < 1" (click)="add()"><app-icon name="cart" /><span>Add to Cart</span></button>}</div>
    @if (feedback()) { <p class="feedback" role="status">{{ feedback() }}</p> }
  </article>`,
  styles: [`:host{display:block;min-width:0}.ai-product{height:100%;border:1px solid #e3eaf6;border-radius:9px;background:#fff;padding:12px;color:#101647}a{text-decoration:none;color:inherit}.image{display:grid;place-items:center;height:145px;margin-bottom:10px;background:#fafbfd;border-radius:5px}.image img{width:100%;height:100%;object-fit:contain}h3{font-size:15px;line-height:1.4;margin:8px 0}.description{font-size:12px;color:#6c7ba5;line-height:1.65;height:60px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;margin:8px 0}.price{font-size:21px;display:block;margin-top:12px}.stock{font-size:12px;color:#00a66b;display:flex;gap:7px;align-items:center}.stock app-icon{width:14px;height:14px}.unavailable{color:#8b7495}.actions{display:flex;gap:8px;margin-top:10px}.actions a{border:1px solid #b5ccff;border-radius:5px;flex:1;padding:10px 4px;text-align:center;color:#06f;font-size:12px}.actions button{width:42px;display:grid;place-items:center;border:0;border-radius:5px;background:#06f;color:white;cursor:pointer}.actions button:disabled{background:#b9c9e2;cursor:default}app-icon{width:21px;height:21px}.feedback{font-size:11px;color:#526791;margin:7px 0 0}.ai-product{padding:10px;display:flex;flex-direction:column;box-sizing:border-box}.image{height:120px;background:white}.description{height:auto;max-height:38px;-webkit-line-clamp:2;font-size:11px;line-height:1.5;margin:4px 0}.price{color:#f51c2d;font-size:17px;margin-top:7px}h3{font-size:13px;margin:5px 0}.stock{font-size:10px;margin:6px 0}.actions{flex-wrap:wrap;margin-top:auto;padding-top:7px;gap:5px}.actions a{flex:1;min-width:70px;padding:8px 3px;color:#008552;border-color:#9fcfb9;font-size:10px}.actions button{display:flex;align-items:center;justify-content:center;gap:5px;width:100%;padding:8px 4px;background:#008552;font:inherit;font-size:11px}.actions button app-icon{width:17px;height:17px}.actions button:disabled{background:#b9c9c3}.actions button span{white-space:nowrap}button:focus-visible,a:focus-visible{outline:2px solid #06f;outline-offset:3px}`]
})
export class AssistantProductCard {
  product = input.required<AssistantProduct>();
  administrator=input(false);
  interactive=input(false);expanded=input(false);
  selected=output<{productId:number;skuId?:number}>();
  select(event:Event){if(this.interactive()){event.preventDefault();event.stopPropagation();this.selected.emit({productId:this.product().id});}}
  variant(id:number){const detail=this.product().detail,sku=detail?.variants.find(row=>row.id===Number(id));if(!detail||!sku)return;Object.assign(detail,{skuId:sku.id,price:sku.price,originalPrice:sku.originalPrice,available:sku.available,promotion:sku.promotion,discount:sku.discount,promotionStartAt:sku.promotionStartAt,promotionEndAt:sku.promotionEndAt,attributes:sku.attributes});this.selected.emit({productId:detail.id,skuId:sku.id});}
  private cart = inject(CartApi);
  private store = inject(CustomerStore);
  busy = signal(false);
  feedback = signal('');
  add() {
    const product = this.product();
    if (this.administrator() || this.busy() || !product.skuId || product.available === null || product.available < 1) return;
    this.busy.set(true);
    this.cart.add(product.skuId).subscribe({
      next: cart => { this.store.cartCount.set(cart.total_items); this.feedback.set('Added to cart'); },
      error: () => { this.feedback.set('Could not add this item. Please try again.'); this.busy.set(false); },
      complete: () => this.busy.set(false)
    });
  }
}
