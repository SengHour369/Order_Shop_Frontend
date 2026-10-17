import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Order } from '../../core/api/models';
import { OrdersApi } from '../orders/orders.api';
import { AssistantApi } from './assistant.api';
import { PaymentQr } from '../payments/payment-qr';

@Component({selector:'app-chat-order', imports:[CurrencyPipe,DatePipe,PaymentQr], template:`
  <section class="chat-order" aria-label="Current order details">
    @if(order(); as current){
      <strong>{{current.order_number}}</strong><p role="status">{{t('Current status', 'ស្ថានភាពបច្ចុប្បន្ន')}}: {{current.status}}</p>
      <p>{{current.total_amount | currency:'USD'}}</p>
      <ol><li>{{t('Order placed', 'បានបញ្ជាទិញ')}} · {{current.order_date | date:'medium'}}</li>@if(current.updated_at){<li>{{t('Last updated', 'បានធ្វើបច្ចុប្បន្នភាព')}} · {{current.updated_at | date:'medium'}}</li>}</ol>
      @for(item of current.items || []; track item.id){<p>SKU #{{item.product_sku_id}} · Quantity {{item.quantity}} · {{item.total_price | currency:'USD'}}</p>}
      @if(current.status==='PENDING'){
        <button type="button" [disabled]="busy()" (click)="prepareCancel()">{{t('Request cancellation','ស្នើសុំបោះបង់')}}</button>
        <button type="button" [disabled]="busy()" (click)="payment.set(true)">{{t('Show KHQR / payment status','បង្ហាញ KHQR / ស្ថានភាពការទូទាត់')}}</button>
      }
      @if(payment()){<app-payment-qr [orderId]="current.id" />}
      @if(confirmation()) {<p>Cancel order {{current.order_number}}?</p><button type="button" [disabled]="busy()" (click)="confirmCancel()">{{t('Confirm cancellation','បញ្ជាក់ការបោះបង់')}}</button><button type="button" [disabled]="busy()" (click)="confirmation.set(null)">{{t('Keep order','រក្សាការបញ្ជាទិញ')}}</button>}
    }
    <button type="button" [disabled]="busy()" (click)="load()">{{t('Refresh order','ធ្វើបច្ចុប្បន្នភាពការបញ្ជាទិញ')}}</button>
    @if(error()){<p role="alert">{{error()}}</p>}
  </section>`,styles:[`.chat-order{border:1px solid #dce5f5;border-radius:8px;padding:12px;font-size:12px}.chat-order button{margin:4px;padding:6px;border:1px solid #c8d8f5;background:white;color:#06f;border-radius:5px}.chat-order ol{padding-left:20px}`]})
export class ChatOrder {
  language=input('en'); orderId=input.required<number>(); order=signal<Order|null>(null); busy=signal(false); error=signal('');
  payment=signal(false); confirmation=signal<string|null>(null);
  private orders=inject(OrdersApi); private ai=inject(AssistantApi); private destroy=inject(DestroyRef); private version=0;
  constructor(){effect(()=>{this.orderId();this.version++;this.order.set(null);this.payment.set(false);this.confirmation.set(null);this.load();});}
  t(en:string,km:string){return this.language()==='km'?km:en;}
  load(){const version=this.version;this.busy.set(true);this.error.set('');this.orders.detail(this.orderId()).pipe(takeUntilDestroyed(this.destroy)).subscribe({
    next:order=>{if(version===this.version){this.order.set(order);this.busy.set(false);}},error:()=>{if(version===this.version){this.error.set('Could not retrieve your current order.');this.busy.set(false);}}
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
