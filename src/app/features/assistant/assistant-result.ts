import { Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CanAccessDirective } from '../../core/auth/can-access.directive';

interface Fact {label:string;value:string;status:boolean;}
interface ResultNode {title:string;kind:'facts'|'list'|'metrics'|'empty';facts:Fact[];children:ResultNode[];metrics:{label:string;value:string}[];orderId?:number;productId?:number;skuId?:number;link?:string;total?:number;}
const hidden=/password|secret|token|checksum|providerHash|idempotency|traceId|requestId|confirmationId|executionId|embedding|qrPayload|qrMd5/i;
export function resultLabel(key:string){return key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bId\b/g,'ID').replace(/\bSku\b/g,'SKU').replace(/\bKhqr\b/g,'KHQR');}
function scalar(value:unknown):value is string|number|boolean|null{return value===null||['string','number','boolean'].includes(typeof value);}
function display(key:string,value:unknown,currency='USD'):string {
 if(value==null)return '—';if(typeof value==='boolean')return value?'Yes':'No';
 if(typeof value==='number'&&/percent|percentage/i.test(key))return `${value}%`;
 if(typeof value==='number')return /amount|price|revenue|subtotal|discount|^total$/i.test(key)?new Intl.NumberFormat('en-US',{style:'currency',currency:/^[A-Z]{3}$/.test(currency)?currency:'USD'}).format(value):new Intl.NumberFormat('en-US').format(value);
 if(/status|method|sourceType|risk/i.test(key))return resultLabel(String(value));
 if(/(?:At|Date|_at|_date)$/.test(key)&&/^\d{4}-\d\d-\d\dT/.test(String(value))){const date=new Date(String(value));if(!Number.isNaN(date.getTime()))return date.toLocaleString();}
 return String(value);
}
export function resultView(data:unknown,intent='',admin=false,title='',depth=0):ResultNode {
 const node:ResultNode={title,kind:'facts',facts:[],children:[],metrics:[]};
 if(data==null){node.kind='empty';return node;}
 if(depth>5){node.facts=[{label:'Details',value:'Open the record to view further details.',status:false}];return node;}
 if(Array.isArray(data)){
  if(data.length&&data.every(row=>row&&typeof row==='object'&&typeof row.count==='number'&&typeof row.status==='string')){
   node.kind='metrics';node.metrics=data.map(row=>({label:resultLabel(row.status),value:display('count',row.count)}));return node;
  }
  node.kind=data.length?'list':'empty';node.total=data.length;
  node.children=data.slice(0,50).map((row,index)=>resultView(row,intent,admin,`Record ${index+1}`,depth+1));return node;
 }
 if(typeof data==='string'&&/^[\[{]/.test(data.trim())){try{const decoded=JSON.parse(data);if(decoded&&typeof decoded==='object')return resultView(decoded,intent,admin,title,depth+1);}catch{/* Display non-JSON text literally. */}}
 if(typeof data!=='object'){node.facts=[{label:'Result',value:display('result',data),status:false}];return node;}
 const row=data as Record<string,unknown>;
 // Legacy service envelopes carry their actual records inside data.
 if('data' in row&&('code' in row||'success' in row||'message' in row))return resultView(row['data'],intent,admin,title,depth+1);
 const currency=typeof row['currency']==='string'?row['currency']:'USD';
 const name=row['order_number']??row['orderNumber']??row['transaction_no']??row['return_number']??row['name']??row['title'];
 if(typeof name==='string')node.title=name;
 const productId=row['product_id']??row['productId'];
 if(typeof productId==='number'&&Number.isSafeInteger(productId)&&productId>0){node.productId=productId;const sku=row['product_sku_id']??row['skuId'];if(typeof sku==='number'&&Number.isSafeInteger(sku)&&sku>0)node.skuId=sku;}
 const id=row['id']??row['orderId'];
 if(typeof id==='number'&&Number.isSafeInteger(id)&&id>0){
  if(/ORDER/.test(intent)&&!(/SUMMARY/.test(intent))&&('order_number' in row||'orderNumber' in row)){node.orderId=id;if(admin)node.link='/admin/orders/'+id;}
  else if(admin&&/USER|CUSTOMER/.test(intent))node.link=(/USER/.test(intent)?'/admin/users/':'/admin/customers/')+id;
  else if(admin&&/PRODUCT/.test(intent)&&!/SKU/.test(intent)&&Array.isArray(row['skus']))node.link='/admin/products/view/'+id;
 }
 for(const [key,value] of Object.entries(row)){
  if(hidden.test(key)||key==='qr'||key==='skippedFields'||value===undefined)continue;
  if(typeof value==='string'&&/^[\[{]/.test(value.trim())){try{const decoded=JSON.parse(value);if(decoded&&typeof decoded==='object'){node.children.push(resultView(decoded,intent,admin,resultLabel(key.replace(/Json$/,'')),depth+1));continue;}}catch{/* Literal text remains text. */}}
  if(scalar(value))node.facts.push({label:resultLabel(key),value:display(key,value,currency),status:/status|state/i.test(key)});
  else node.children.push(resultView(value,intent,admin,resultLabel(key),depth+1));
 }
 if(!node.facts.length&&!node.children.length)node.kind='empty';
 return node;
}
@Component({selector:'app-assistant-result',imports:[NgTemplateOutlet,RouterLink,CanAccessDirective],template:`
<section class="chat-result" [attr.aria-label]="heading()">
 <header><strong>{{heading()}}</strong></header>
 <ng-container *ngTemplateOutlet="nodeTemplate;context:{$implicit:view()}"/>
</section>
<ng-template #nodeTemplate let-node>
 @if(node.kind==='empty'){<p class="empty-result">No records found.</p>}
 @else if(node.kind==='metrics'){<div class="metric-grid">@for(metric of node.metrics;track $index){<article><span class="metric-label">{{metric.label}}</span><strong>{{metric.value}}</strong></article>}</div>}
 @else{
  @if(node.facts.length){<dl class="result-facts">@for(fact of node.facts;track $index){<div><dt>{{fact.label}}</dt><dd [class.state]="fact.status" [class.negative]="fact.status && negative(fact.value)" [class.waiting]="fact.status && waiting(fact.value)">{{fact.value}}</dd></div>}</dl>}
  @if(node.productId && voiceActive()){<button type="button" class="result-action" (click)="selectProduct.emit({productId:node.productId,skuId:node.skuId})">Explain product in this call</button>}
  @if(node.orderId){<button type="button" class="result-action" (click)="openRecord.emit(node.orderId)">View order details here</button>}
  @if(node.link){<a class="result-action" [routerLink]="node.link" *appCanRoute="node.link">Open record →</a>}
  <div class="result-list">@for(child of node.children;track $index){<article class="result-group"><h4>{{child.title}}</h4><ng-container *ngTemplateOutlet="nodeTemplate;context:{$implicit:child}"/></article>}</div>
  @if(node.total>50){<p class="result-caption">Showing 50 of {{node.total}} records. Narrow your request to see specific records.</p>}
 }
</ng-template>`,styleUrl:'./assistant-result.scss'})
export class AssistantResult {
 negative(value:string){return /failed|cancelled|canceled|rejected|expired|denied/i.test(value);}
 waiting(value:string){return /pending|processing|review|draft/i.test(value);}
 voiceActive=input(false);selectProduct=output<{productId:number;skuId?:number}>();
 data=input<unknown>(null);intent=input('');administrator=input(false);openRecord=output<number>();
 view=computed(()=>resultView(this.data(),this.intent(),this.administrator()));
 heading=computed(()=>({ADMIN_ORDER_SUMMARY:'Order Summary',ADMIN_REVENUE_SUMMARY:'Revenue Summary',ADMIN_ORDER_LIST:'Orders',ORDER_LIST:'Your Orders',MY_ORDERS:'Your Orders',INVENTORY_GET:'Inventory',INVENTORY_LOW_STOCK:'Low Stock',ADMIN_USER_LIST:'Customers',ADMIN_PAYMENT_LIST:'Payments',ADMIN_RETURN_LIST:'Returns',ADMIN_AUDIT_LOG:'Activity History',PROMOTION_GET:'Promotions',CHECKOUT_PREVIEW:'Checkout Review',CART_GET:'Your Cart',ADMIN_IMPORT_DRAFT:'Draft Request'} as Record<string,string>)[this.intent()]||resultLabel(this.intent().replace(/^ADMIN_/,''))||'Details');
}
