import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, throwError, timeout } from 'rxjs';
import { CustomerReturnsApi, CustomerReturnDetail } from './customer-returns.api';
import { CatalogApi } from '../../catalog/catalog.api';
import { Product } from '../../../core/api/models';
import { PageState } from '../../../shared/utils/page-state';
import { Status } from '../../../shared/components/status';
import { Icon } from '../../../shared/components/icon';
import { ProductImage } from '../../../shared/components/product-image';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
export const RETURN_LABELS:Record<string,string>={REQUESTED:'Return Requested',UNDER_REVIEW:'Under Review',APPROVED:'Approved',RECEIVED:'Received',INSPECTING:'Inspecting',COMPLETED:'Processed',REJECTED:'Rejected',CANCELLED:'Cancelled',REFUNDED:'Refunded',SUCCESS:'Refunded',PENDING:'Pending',PROCESSED:'Processed',FAILED:'Failed'};
@Component({
  imports:[CurrencyPipe,DatePipe,RouterLink,Status,Icon,ProductImage,TranslatePipe],
  templateUrl:'./return-detail.html',styleUrl:'./return-detail.scss',
})
export class CustomerReturnDetailPage extends PageState {
  private readonly api=inject(CustomerReturnsApi);
  private readonly catalog=inject(CatalogApi);
  private readonly route=inject(ActivatedRoute);
  private readonly returnDestroyRef=inject(DestroyRef);
  private catalogRequest?:Subscription;
  id='';
  readonly detail=signal<CustomerReturnDetail|null>(null);
  readonly product=signal<Product|null>(null);
  readonly steps=['Return Requested','Under Review','Approved','Processed','Refunded'];
  readonly exceptional=computed(()=>['REJECTED','CANCELLED'].includes(this.detail()?.status||''));
  readonly current=computed(()=>{
    const d=this.detail();if(!d||this.exceptional())return -1;
    if(['REFUNDED','SUCCESS'].includes(d.refund?.status||''))return 4;
    return ({REQUESTED:0,UNDER_REVIEW:1,APPROVED:2,RECEIVED:2,INSPECTING:2,COMPLETED:3} as Record<string,number>)[d.status] ?? -1;
  });
  readonly history=computed(()=>{
    const d=this.detail();if(!d)return [];
    const rows=[...(d.history||[])];
    if(!rows.some(h=>h.status==='REQUESTED'))rows.push({status:'REQUESTED',changed_at:d.requested_at});
    return rows.sort((a,b)=>Date.parse(a.changed_at)-Date.parse(b.changed_at));
  });
  constructor(){super();this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params=>{this.id=params.get('id')||'';this.detail.set(null);this.product.set(null);this.load(true);});}
  load(replace=false){
    if(this.busy()&&!replace)return;
    this.catalogRequest?.unsubscribe();
    if(!/^[A-Za-z0-9_-]{1,80}$/.test(this.id)){this.run(throwError(()=>new Error('Invalid return ID.')),()=>{},true);return;}
    this.run(this.api.detail(this.id),detail=>{
      this.detail.set(detail);this.product.set(null);
      if(detail.product_id)this.catalogRequest=this.catalog.detail(detail.product_id)
        .pipe(timeout({first:5000}),takeUntilDestroyed(this.returnDestroyRef))
        .subscribe({next:product=>this.product.set(product),error:()=>this.product.set(null)});
    },replace);
  }
  label(status:string){return RETURN_LABELS[status]||status;}
  stepDate(i:number){
    const statuses=[['REQUESTED'],['UNDER_REVIEW'],['APPROVED'],['COMPLETED'],['REFUNDED','SUCCESS']][i];
    if(i===4)return ['REFUNDED','SUCCESS'].includes(this.detail()?.refund?.status||'')?this.detail()?.refund?.processed_at:null;
    return this.history().find(h=>statuses.includes(h.status))?.changed_at || null;
  }
}
