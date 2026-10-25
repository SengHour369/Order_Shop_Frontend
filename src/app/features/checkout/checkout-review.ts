import { conversationId } from "../../shared/utils/conversation-id";
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Order } from '../../core/api/models';
import { CheckoutAttempt } from './checkout-attempt';
import { CartApi } from '../cart/cart.api';

@Injectable({providedIn:'root'})
export class CheckoutReview {
  private auth=inject(AuthService);
  private cart=inject(CartApi);
  private attempt=inject(CheckoutAttempt);
  private key(){return 'eshop.checkout-review.'+this.auth.userId();}
  save(addressId:number,method:string){try{sessionStorage.setItem(this.key(),JSON.stringify({addressId,method}));}catch{/* Preferences are optional. */}}
  read():{addressId:number;method:string}|null{try{return JSON.parse(sessionStorage.getItem(this.key())||'null');}catch{return null;}}
  private restoreKey(orderId:number,sku:number,existing:number,quantity:number){
    const slot=`eshop.restore.${this.auth.userId()}.${orderId}.${sku}.${existing}.${quantity}`;
    const saved=sessionStorage.getItem(slot);
    if(saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved))return saved;
    const key=conversationId();
    sessionStorage.setItem(slot,key);
    return key;
  }
  async restore(order:Order){
    if(!['FAILED','CANCELLED'].includes(order.status))throw new Error('The shop is still confirming your order. Check payment status before trying again.');
    if(!order.items?.length)throw new Error('Order items are unavailable. Open your order details before retrying.');
    let cart=await firstValueFrom(this.cart.load());
    const quantities=new Map<number,number>();
    for(const item of order.items)quantities.set(item.product_sku_id,(quantities.get(item.product_sku_id)||0)+item.quantity);
    for(const [sku,quantity] of quantities){
      const existing=cart.items.filter(item=>item.product_sku_id===sku).reduce((total,item)=>total+item.quantity,0);
      if(existing<quantity)cart=await firstValueFrom(this.cart.add(sku,quantity-existing,this.restoreKey(order.id,sku,existing,quantity)));
    }
    if(this.attempt.orderId(this.auth.userId())===order.id)this.attempt.clear(this.auth.userId());
    return cart;
  }
}
