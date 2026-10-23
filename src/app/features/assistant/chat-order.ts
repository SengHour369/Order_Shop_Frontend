import { AddressesApi } from '../addresses/addresses.api';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/components/icon';
import { OrderProgress } from '../../shared/components/order-progress';
import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Address, Order } from '../../core/api/models';
import { OrdersApi } from '../orders/orders.api';
import { AssistantApi } from './assistant.api';
import { PaymentQr } from '../payments/payment-qr';

@Component({selector:'app-chat-order', imports:[CurrencyPipe,DatePipe,PaymentQr,RouterLink,Icon,OrderProgress],
  templateUrl:'./chat-order.html',styleUrl:'./chat-order.css'})
export class ChatOrder {
  language=input('en'); orderId=input.required<number>(); order=signal<Order|null>(null); busy=signal(false); error=signal('');
  address=signal<Address|null>(null); addressError=signal('');
  private addresses=inject(AddressesApi);
  tracking=signal(true);
  itemSubtotal(){return (this.order()?.items || []).reduce((sum,item)=>sum+item.total_price,0);}
  payment=signal(false); confirmation=signal<string|null>(null);
  private orders=inject(OrdersApi); private ai=inject(AssistantApi); private destroy=inject(DestroyRef); private version=0;
  constructor(){effect(()=>{this.orderId();this.version++;this.order.set(null);this.address.set(null);this.addressError.set('');this.payment.set(false);this.tracking.set(true);this.confirmation.set(null);untracked(()=>this.load());});}
  t(en:string,km:string){return this.language()==='km'?km:en;}
  load(){const version=this.version;this.busy.set(true);this.error.set('');this.orders.detail(this.orderId()).pipe(takeUntilDestroyed(this.destroy)).subscribe({
    next:order=>{if(version===this.version){this.order.set(order);this.busy.set(false);
      this.address.set(null);this.addressError.set('');
      if(order.shipping_address_id) this.addresses.list().pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next:addresses=>{if(version===this.version)this.address.set(addresses.find(address=>address.id===order.shipping_address_id)??null);},
        error:()=>{if(version===this.version)this.addressError.set('Shipping address is temporarily unavailable.');}
      });}},error:()=>{if(version===this.version){this.error.set('Could not retrieve your current order.');this.busy.set(false);}}
  });}
  prepareCancel(){const order=this.order();if(!order||this.busy())return;this.busy.set(true);this.error.set('');
    this.ai.tool('ORDER_CANCEL',{orderNumber:order.order_number}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:result=>{
      const data=result.data as Record<string,unknown>|null;this.busy.set(false);
      if(result.errorCode==='CONFIRMATION_REQUIRED'&&typeof data?.['confirmationId']==='string')this.confirmation.set(data['confirmationId']);else this.error.set(result.message);
    },error:()=>{this.busy.set(false);this.error.set('Cancellation could not be prepared.');}});
  }
  confirmCancel(){const id=this.confirmation();if(!id||this.busy())return;this.busy.set(true);
    this.ai.confirm(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:result=>{this.confirmation.set(null);this.busy.set(false);if(result.status==='SUCCESS')this.load();else this.error.set(result.message);},
      error:()=>{this.busy.set(false);this.error.set('Cancellation result is unknown. Refresh the order before submitting another request.');}});
  }
}
