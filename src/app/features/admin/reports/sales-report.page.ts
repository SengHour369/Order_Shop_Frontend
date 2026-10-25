import {Envelope} from '../../../core/api/models';
import {unwrap} from '../../../core/api/response';
import {Component,inject,signal,viewChild,ElementRef} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DecimalPipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {forkJoin,of,catchError,map} from 'rxjs';
import {AdminApi} from '../api/admin.api';
import {ApiClient} from '../../../core/api/api-client';
import {Icon} from '../../../shared/components/icon';
import {Status} from '../../../shared/components/status';
import {PageAccessDenied} from '../../../shared/components/page-access-denied';
import {PageState} from '../../../shared/utils/page-state';
import {MonthlyReport} from './report.models';
interface Details{monthlyItems:{month:number;items:number}[];categories:{name:string;amount:number;items:number}[];categoriesAvailable:boolean;categoryBasis:string;}
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
@Component({imports:[FormsModule,DecimalPipe,RouterLink,Icon,Status,PageAccessDenied],templateUrl:'./sales-report.html',styleUrl:'./sales-report.css'})
export class SalesReportPage extends PageState{
 private api=inject(AdminApi);private http=inject(ApiClient);
 readonly monthDialog=viewChild<ElementRef<HTMLDialogElement>>('monthDialog');selectedMonth=signal(1);
 openMonth(month:number){this.selectedMonth.set(month);this.monthDialog()?.nativeElement.showModal();}
 selectedRow(){return this.breakdown()[this.selectedMonth()-1];}
 year=new Date().getFullYear();loadedYear=signal(this.year);rows=signal<MonthlyReport[]>([]);previous=signal<MonthlyReport[]|null>(null);details=signal<Details|null>(null);ready=signal(false);
 readonly ticks=[0,1,2,3,4];readonly palette=['#2875ff','#10b889','#ff982f','#8b54f7','#e35687','#34a9bf'];
 constructor(){super();this.load();}
 load(){if(this.busy())return;if(!Number.isInteger(this.year)||this.year<2000||this.year>2100){this.error.set('Choose a year between 2000 and 2100.');return;}const year=this.year;this.ready.set(false);
  this.run(forkJoin({rows:this.api.monthlyReport('sales',year),previous:this.api.monthlyReport('sales',year-1).pipe(catchError(()=>of(null))),details:this.http.get<Envelope<Details>>('/api/v1/orders/reports/sales-details',{year}).pipe(map(unwrap),catchError(()=>of(null)))}),result=>{this.loadedYear.set(year);this.rows.set(result.rows);this.previous.set(result.previous);this.details.set(result.details);this.ready.set(true);});
 }
 total(){return this.rows().reduce((sum,r)=>sum+Number(r.amount),0);}orders(){return this.rows().reduce((sum,r)=>sum+Number(r.count),0);}average(){return this.orders()?this.total()/this.orders():0;}
 items(){return this.details()?.monthlyItems.reduce((sum,r)=>sum+Number(r.items),0)??null;}
 breakdown(){return months.map((name,index)=>{const month=index+1;const rows=this.rows().filter(r=>r.month===month);const count=rows.reduce((s,r)=>s+Number(r.count),0),amount=rows.reduce((s,r)=>s+Number(r.amount),0);return{month,name,count,amount,average:count?amount/count:0,items:this.details()?Number(this.details()!.monthlyItems.find(r=>r.month===month)?.items??0):null};});}
 money(value:number){return 'USD '+value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
 growth(kind:'orders'|'sales'){const previous=this.previous();if(!previous)return null;const old=previous.reduce((s,r)=>s+Number(kind==='orders'?r.count:r.amount),0);if(!old)return null;return ((kind==='orders'?this.orders():this.total())-old)/old*100;}
 maxSales(){return Math.max(1,...this.breakdown().map(r=>r.amount));}maxOrders(){return Math.max(4,Math.ceil(Math.max(0,...this.breakdown().map(r=>r.count))/4)*4);}
 x(index:number){return 62+index*45;}salesY(amount:number){return 185-amount/this.maxSales()*150;}orderY(count:number){return 185-count/this.maxOrders()*150;}
 points(){return this.breakdown().map((r,i)=>`${this.x(i)},${this.orderY(r.count)}`).join(' ');}
 categories(){return (this.details()?.categories??[]).filter(r=>Number(r.amount)>0).sort((a,b)=>Number(b.amount)-Number(a.amount));}
 categoryTotal(){return this.categories().reduce((sum,r)=>sum+Number(r.amount),0);}percent(amount:number){return this.categoryTotal()?Number(amount)/this.categoryTotal()*100:0;}
 donut(){let end=0;return 'conic-gradient('+this.categories().map((r,i)=>{const start=end;end+=this.percent(r.amount);return `${this.palette[i%this.palette.length]} ${start}% ${end}%`;}).join(',')+')';}
 range(month:number){const start=`${this.loadedYear()}-${String(month).padStart(2,'0')}-01`;return {q:'',startDate:start,endDate:new Date(Date.UTC(this.loadedYear(),month,0)).toISOString().slice(0,10)};}
 download(){const lines=['Year,Month,Orders,Items Sold,Currency,Sales,Average Order Value',...this.breakdown().map(r=>[this.loadedYear(),r.month,r.count,r.items??'','USD',r.amount.toFixed(2),r.average.toFixed(2)].join(','))];const url=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`sales-${this.loadedYear()}.csv`;link.click();URL.revokeObjectURL(url);}
}
