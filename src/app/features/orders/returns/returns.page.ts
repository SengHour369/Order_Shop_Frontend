import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerReturnsApi, CustomerReturnSummary } from './customer-returns.api';
import { RETURN_LABELS } from './return-detail.page';
import { PageState } from '../../../shared/utils/page-state';
import { Status } from '../../../shared/components/status';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
@Component({
 imports:[RouterLink,CurrencyPipe,DatePipe,Status,TranslatePipe],
 template:`<div class="page-heading"><h1>{{ 'My Returns' | translate }}</h1><a routerLink="/account/orders">{{ 'My Orders' | translate }}</a></div>
 <app-status [busy]="busy()" [error]="error()" />@if(error()){<button (click)="load()">{{ 'Try again' | translate }}</button>}
 @for(r of rows();track r.return_id){<a class="return-list-row" [routerLink]="['/account/returns',r.return_id]"><div><strong>#{{r.return_id}}</strong><p>{{r.requested_at | date:'MMM d, y, h:mm a'}}</p></div><span>{{label(r.status) | translate}}</span><strong>{{r.amount | currency:'USD'}}</strong></a>}@empty{@if(!busy()&&!error()){<div class="panel">{{ 'No return requests yet.' | translate }}</div>}}
 <div class="return-pagination"><button [disabled]="page()===0||busy()" (click)="goto(page()-1)">{{ 'Previous' | translate }}</button><span>{{page()+1}} / {{pages()}}</span><button [disabled]="page()+1>=pages()||busy()" (click)="goto(page()+1)">{{ 'Next' | translate }}</button></div>`,
 styles:[`.return-list-row{display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid #e3e7f0;padding:16px;margin:12px 0;border-radius:7px;font-size:13px}.return-list-row p{color:#777294;margin:6px 0 0;font-size:12px}.return-list-row>span{color:#008650}.return-pagination{display:flex;align-items:center;justify-content:center;gap:15px;margin-top:24px;font-size:12px}@media(max-width:700px){.return-list-row{flex-wrap:wrap}}`],
})
export class CustomerReturnsPage extends PageState {
 private readonly api=inject(CustomerReturnsApi);
 readonly rows=signal<CustomerReturnSummary[]>([]);
 readonly page=signal(0);readonly pages=signal(1);
 constructor(){super();this.load();}
 load(){this.run(this.api.list(this.page()),p=>{this.rows.set(p.content);this.pages.set(Math.max(1,p.totalPages));});}
 goto(page:number){if(this.busy()||page<0||page>=this.pages())return;this.page.set(page);this.load();}
 label(status:string){return RETURN_LABELS[status]||status;}
}
