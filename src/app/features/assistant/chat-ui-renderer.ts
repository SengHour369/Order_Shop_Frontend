import { ProductsPage } from '../admin/products/products.page';
import { PaymentsPage } from '../admin/payments/payments.page';
import { PromotionsPage } from '../admin/promotions/promotions.page';
import { ChatCheckout } from './chat-checkout/chat-checkout';
import { InventoryReferencePage } from '../admin/inventory/inventory-reference.page';
import { Component, input, output, signal } from '@angular/core';
import { OrdersPage, OrderDetailPage } from '../admin/orders/orders.page';
import { ChatPresentation } from './chat-presentation';

@Component({
  selector: 'app-chat-ui-renderer',
  imports: [ProductsPage, PaymentsPage, PromotionsPage, ChatCheckout, OrdersPage, OrderDetailPage, InventoryReferencePage],
  template: `
    <section class="embedded-ui" aria-label="Assistant workspace">
      @if (presentation().schemaVersion !== '1.0') {
        <p role="alert">This response needs a newer interface. Please retry after refreshing.</p>
      } @else {
        @for (block of presentation().blocks; track $index) {
          @switch (block.kind) {
            @case ('orders.list') {
              @if (selectedOrder(); as id) {
                <button type="button" class="adm-btn" (click)="selectedOrder.set(null)">Back to orders</button>
                <app-admin-order-detail [embeddedOrderId]="id" />
              } @else {
                <app-admin-orders [embedded]="true" [queryRecords]="block.records ?? null" [queryDate]="block.date || ''" (openOrder)="viewOrder($event)" />
              }
            }
            @case ('orders.detail') {
              @if(validOrderId(block.entityId)){<app-admin-order-detail [embeddedOrderId]="block.entityId" />}
              @else {<p role="alert">This order reference is invalid. Please choose an order again.</p>}
            }
            @case ('products.list') { <app-admin-products-list [embedded]="true" (openProduct)="selectProduct.emit({productId:$event})" /> }
            @case ('payments.list') { <app-admin-payments-list [queryRecords]="block.records ?? null" /> }
            @case ('promotions.list') { <app-admin-promotions /> }
            @case ('cart.checkout') { <app-chat-checkout /> }
            @case ('inventory.list') { <app-admin-inventory [embedded]="true" /> }
            @case ('inventory.low-stock') { <app-admin-inventory [embedded]="true" initialStockStatus="LOW_STOCK" /> }
            @case ('error.notice') { <p role="alert">{{block.explanation}}</p> }
            @default { <p role="alert">This view is unavailable. Please retry your request.</p> }
          }
        }
      }
    </section>`,
  styles: [':host{display:block;min-width:0}.embedded-ui{background:white;border:1px solid #dce5f5;border-radius:12px;padding:12px;overflow:auto;max-width:100%}']
})
export class ChatUiRenderer {
  selectProduct=output<{productId:number;skuId?:number}>();
  presentation = input.required<ChatPresentation>();
  selectedOrder = signal<number | null>(null);
  validOrderId(id:number){return Number.isSafeInteger(id) && id>0;}
  viewOrder(id: number) { if (Number.isSafeInteger(id) && id > 0) this.selectedOrder.set(id); }
}
