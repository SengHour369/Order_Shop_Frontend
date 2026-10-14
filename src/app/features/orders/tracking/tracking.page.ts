import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, throwError } from 'rxjs';
import { OrdersApi } from '../orders.api';
import { AddressesApi } from '../../addresses/addresses.api';
import { Address, Order } from '../../../core/api/models';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Icon } from '../../../shared/components/icon';
import { PageState } from '../../../shared/utils/page-state';
import { Status } from '../../../shared/components/status';

const LABELS: Record<string, string> = { PENDING:'Order Placed', CONFIRMED:'Confirmed', PROCESSING:'Processing', SHIPPED:'Shipped', OUT_FOR_DELIVERY:'Out for Delivery', DELIVERED:'Delivered', COMPLETED:'Completed', CHECKOUT_PENDING:'Confirming stock', FAILED:'Failed', CANCELLED:'Cancelled', REFUNDED:'Refunded' };
const MESSAGES: Record<string,string> = { PENDING:'Your order has been placed.', CONFIRMED:'Your order has been confirmed.', PROCESSING:'We are preparing your order.', SHIPPED:'Your order has been shipped.', OUT_FOR_DELIVERY:'Your order is out for delivery.', DELIVERED:'Your package has been delivered. Thank you for shopping with us!', COMPLETED:'Your order has been completed.', CHECKOUT_PENDING:'The shop is confirming inventory for your order.', FAILED:'This checkout could not be completed.', CANCELLED:'This order was cancelled.', REFUNDED:'This order was refunded.' };
@Component({
 imports:[CurrencyPipe,DatePipe,RouterLink,TranslatePipe,Icon,Status],
 templateUrl:'./tracking.html',styleUrl:'./tracking.scss',
})
export class TrackingPage extends PageState {
 private readonly api=inject(OrdersApi);
 private readonly addresses=inject(AddressesApi);
 private readonly route=inject(ActivatedRoute);
 private readonly trackingDestroyRef=inject(DestroyRef);
 private addressRequest?:Subscription;
 id=0;
 order=signal<Order|null>(null);
 address=signal<Address|null>(null);
 addressBusy=signal(false);
 expanded=signal(false);
 readonly steps=['Order Placed','Processing','Shipped','Out for Delivery','Delivered'];
 readonly current=computed(()=>(({PENDING:0,CONFIRMED:1,PROCESSING:1,SHIPPED:2,OUT_FOR_DELIVERY:3,DELIVERED:4,COMPLETED:4} as Record<string,number>)[this.order()?.status || ''] ?? -1));
 readonly exceptional=computed(()=>['FAILED','CANCELLED','REFUNDED'].includes(this.order()?.status || ''));
 readonly events=computed(()=>{
  const o=this.order();if(!o)return [];
  const placed={key:'placed',title:'Order Placed',date:o.order_date,icon:'save',description:'Your order has been placed successfully.',snapshot:false};
  return o.status==='PENDING' ? [placed] : [{key:'latest',title:this.statusLabel(o.status),date:o.updated_at || '',icon:this.icon(o.status),description:MESSAGES[o.status] || 'The shop has provided this order status.',snapshot:true},placed];
 });
 constructor(){
  super();
  this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params=>{
   this.id=Number(params.get('id'));this.order.set(null);this.address.set(null);this.expanded.set(false);this.load(true);
  });
 }
 load(replace=false){
  if(this.busy()&&!replace)return;
  this.addressRequest?.unsubscribe();this.addressBusy.set(false);
  if(!Number.isSafeInteger(this.id)||this.id<1){this.run(throwError(()=>new Error('Invalid order.')),()=>{},true);return;}
  this.run(this.api.detail(this.id),o=>{
   this.order.set(o);this.address.set(null);this.addressBusy.set(true);
   this.addressRequest=this.addresses.list().pipe(takeUntilDestroyed(this.trackingDestroyRef)).subscribe({
    next:rows=>{this.address.set(rows.find(a=>a.id===o.shipping_address_id)||null);this.addressBusy.set(false);},
    error:()=>{this.address.set(null);this.addressBusy.set(false);},
   });
  },replace);
 }
 statusLabel(status:string){return LABELS[status] || status;}
 description(status:string){return MESSAGES[status] || 'The shop has provided this order status.';}
 icon(status:string){return ['SHIPPED','OUT_FOR_DELIVERY'].includes(status)?'truck':['DELIVERED','COMPLETED'].includes(status)?'clock':this.exceptional()?'help':'settings';}
}
