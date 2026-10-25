import {Component,inject,signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {ApiClient} from '../../../core/api/api-client';
import {PageState} from '../../../shared/utils/page-state';
import {Status} from '../../../shared/components/status';
import {Icon} from '../../../shared/components/icon';
import {PageAccessDenied} from '../../../shared/components/page-access-denied';
interface Review{id:string;productId:number;productName:string;customerType:string;author:string;rating:number;title:string;body:string;createdAt:string;verifiedPurchase:boolean;moderationStatus:string;}
interface ReviewPage{content:Review[];last:boolean;totalElements:number;totalPages:number;counts:Record<string,number>;}
@Component({imports:[DatePipe,FormsModule,RouterLink,Status,Icon,PageAccessDenied],templateUrl:'./guest-review-moderation.html',styleUrl:'./guest-review-moderation.css'})
export class GuestReviewModerationPage extends PageState{
 private api=inject(ApiClient);reviews=signal<Review[]>([]);counts=signal<Record<string,number>>({ALL:0,PENDING:0,APPROVED:0,REJECTED:0});page=0;pages=0;total=0;hasNext=false;ready=signal(false);
 search='';rating='';status='ALL';type='';from='';to='';applied={search:'',rating:'',status:'ALL',type:'',from:'',to:''};
 readonly tabs=[{label:'All Reviews',value:'ALL'},{label:'Pending',value:'PENDING'},{label:'Approved',value:'APPROVED'},{label:'Rejected',value:'REJECTED'}];
 constructor(){super();this.load();}
 count(status:string){return this.counts()[status] || 0;}
 load(){if(this.busy())return;const filters=this.applied;const params:Record<string,string|number>={page:this.page,status:filters.status};for(const key of ['search','rating','type','from','to'] as const)if(filters[key])params[key]=filters[key];
 this.run(this.api.get<ReviewPage>('/api/v1/admin/guest-reviews',params),result=>{this.reviews.set(result.content);this.counts.set(result.counts);this.hasNext=!result.last;this.total=result.totalElements;this.pages=result.totalPages;this.ready.set(true);});}
 apply(){if(this.busy())return;if(this.from && this.to && this.from>this.to){this.error.set('The end date must be on or after the start date.');return;}this.applied={search:this.search.trim(),rating:this.rating,status:this.status,type:this.type,from:this.from,to:this.to};this.page=0;this.load();}
 reset(){if(this.busy())return;this.search='';this.rating='';this.status='ALL';this.type='';this.from='';this.to='';this.apply();}
 pick(status:string){if(this.busy())return;this.status=status;this.applied={...this.applied,status};this.page=0;this.load();}
 changePage(delta:number){if(this.busy()||this.page+delta<0||delta>0&&!this.hasNext)return;this.page+=delta;this.load();}
 decide(id:string,status:'APPROVED'|'REJECTED'){if(this.busy())return;const row=this.reviews().find(review=>review.id===id);if(!row||row.moderationStatus!=='PENDING')return;this.run(this.api.put('/api/v1/admin/guest-reviews/'+id,{status}),()=>{if(this.page>0&&this.reviews().length===1)this.page--;this.load();});}
}
