import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiClient } from '../../../core/api/api-client';
import { PageState } from '../../../shared/utils/page-state';
import { Status } from '../../../shared/components/status';
interface PendingReview {id:string;productId:number;customerType:string;author:string;rating:number;title:string;body:string;createdAt:string;verifiedPurchase:boolean;}
@Component({imports:[DatePipe,RouterLink,Status],template:`
  <section><div class="adm-page-head"><div><h2>Review moderation</h2><p>Review guest and customer submissions before publishing them on the storefront.</p></div><button class="adm-btn" (click)="load()" [disabled]="busy()">Refresh</button></div>
  <app-status [busy]="busy()" [error]="error()" [message]="message()" />
  <div class="moderation-list">@for (review of reviews(); track review.id) {<article class="adm-panel"><div class="review-meta"><strong>{{review.author}}</strong><span>{{review.customerType}}</span><span>{{review.rating}} / 5 stars</span><time>{{review.createdAt | date:'medium'}}</time></div><h3>{{review.title}}</h3><p class="review-body">{{review.body}}</p><p><a [routerLink]="['/admin/products',review.productId]">Product #{{review.productId}}</a> · {{review.verifiedPurchase ? 'Verified delivered purchase' : 'Purchase not verified'}}</p><div class="adm-actions"><button class="adm-btn adm-primary" [disabled]="busy()" (click)="decide(review.id,'APPROVED')">Approve & publish</button><button class="adm-btn" [disabled]="busy()" (click)="decide(review.id,'REJECTED')">Reject</button></div></article>} @empty { @if (!busy()) {<div class="adm-panel">No reviews awaiting moderation.</div>} }</div>
  <div class="adm-actions"><button class="adm-btn" [disabled]="busy() || page===0" (click)="changePage(-1)">Previous</button><span>Page {{page+1}}</span><button class="adm-btn" [disabled]="busy() || !hasNext" (click)="changePage(1)">Next</button></div></section>`,styles:[`.moderation-list{display:grid;gap:16px;margin-bottom:20px}.review-meta{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:#607269}.review-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65}.adm-actions{align-items:center}`]})
export class GuestReviewModerationPage extends PageState {
  private api=inject(ApiClient);reviews=signal<PendingReview[]>([]);page=0;hasNext=false;
  constructor(){super();this.load();}
  load(){this.run(this.api.get<{content:PendingReview[];last:boolean}>('/api/v1/admin/guest-reviews',{page:this.page}),result=>{this.reviews.set(result.content);this.hasNext=!result.last;});}
  changePage(delta:number){this.page+=delta;this.load();}
  decide(id:string,status:'APPROVED'|'REJECTED'){if(this.busy())return;this.run(this.api.put('/api/v1/admin/guest-reviews/'+id,{status}),()=>{this.reviews.update(rows=>rows.filter(row=>row.id!==id));this.message.set(status==='APPROVED'?'Review published.':'Review rejected.');});}
}
