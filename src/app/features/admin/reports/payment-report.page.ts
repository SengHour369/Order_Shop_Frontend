import {Component,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DecimalPipe} from '@angular/common';
import {map} from 'rxjs';
import {ApiClient} from '../../../core/api/api-client';
import {Envelope} from '../../../core/api/models';
import {unwrap} from '../../../core/api/response';
import {PageState} from '../../../shared/utils/page-state';
import {Status} from '../../../shared/components/status';
import {Icon} from '../../../shared/components/icon';
import {PageAccessDenied} from '../../../shared/components/page-access-denied';
interface PaymentGroup{month:number;currency:string|null;method:string|null;status:string;count:number;amount:number;}
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
@Component({imports:[FormsModule,DecimalPipe,Status,Icon,PageAccessDenied],templateUrl:'./payment-report.html',styleUrl:'./payment-report.css'})
export class PaymentReportPage extends PageState{
 private api=inject(ApiClient);
 year=new Date().getFullYear();currency='USD';loadedYear=signal(this.year);loadedCurrency=signal('USD');rows=signal<PaymentGroup[]>([]);ready=signal(false);
 readonly years=Array.from({length:101},(_,i)=>2100-i);readonly ticks=[4,3,2,1,0];readonly palette=['#009965','#0967ff','#ff8d2a','#9223d7','#e15a85','#29aebc'];
 constructor(){super();this.load();}
 currencies(){return [...new Set(['USD','KHR',...this.rows().map(row=>row.currency || 'Unspecified')])];}
 load(){if(this.busy())return;if(!Number.isInteger(Number(this.year))||this.year<2000||this.year>2100){this.error.set('Choose a year between 2000 and 2100.');return;}const year=Number(this.year),currency=this.currency;
 this.ready.set(false);this.run(this.api.get<Envelope<PaymentGroup[]>>('/api/v1/payments/reports/breakdown',{year}).pipe(map(unwrap)),rows=>{this.rows.set(rows);this.loadedYear.set(year);this.loadedCurrency.set(currency);this.ready.set(true);});}
 reset(){this.year=new Date().getFullYear();this.currency='USD';this.load();}
 selected(){return this.rows().filter(row=>(row.currency || 'Unspecified')===this.loadedCurrency());}
 completed(){return this.selected().filter(row=>row.status==='COMPLETED');}
 count(){return this.completed().reduce((sum,row)=>sum+Number(row.count),0);}
 total(){return this.completed().reduce((sum,row)=>sum+Number(row.amount),0);}
 average(){return this.count()?this.total()/this.count():0;}
 refunds(){return this.selected().filter(row=>row.status==='REFUNDED').reduce((sum,row)=>sum+Number(row.amount),0);}
 refundCount(){return this.selected().filter(row=>row.status==='REFUNDED').reduce((sum,row)=>sum+Number(row.count),0);}
 money(value:number){return this.loadedCurrency()+' '+value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
 monthly(){return months.map((name,index)=>{const rows=this.selected().filter(row=>row.month===index+1),completed=rows.filter(row=>row.status==='COMPLETED');const count=completed.reduce((s,r)=>s+Number(r.count),0),amount=completed.reduce((s,r)=>s+Number(r.amount),0);return{month:index+1,name,count,amount,average:count?amount/count:0,refunded:rows.filter(row=>row.status==='REFUNDED').reduce((s,r)=>s+Number(r.amount),0)};});}
 ceiling(){const max=Math.max(0,...this.monthly().map(row=>row.amount));if(!max)return 1;const magnitude=10**Math.floor(Math.log10(max));return Math.ceil(max/magnitude)*magnitude*1.25;}
 barHeight(amount:number){return amount/this.ceiling()*100;}
 methods(){const grouped=new Map<string,number>();for(const row of this.completed()){const method=row.method || 'Unspecified';grouped.set(method,(grouped.get(method)||0)+Number(row.amount));}return [...grouped].sort((a,b)=>b[1]-a[1]).map(([name,amount],i)=>({name,amount,percent:this.total()?amount/this.total()*100:0,color:this.palette[i%this.palette.length]}));}
 donut(){let offset=0;return 'conic-gradient('+this.methods().map(method=>{const start=offset;offset+=method.percent;return `${method.color} ${start}% ${offset}%`;}).join(',')+')';}
 download(){if(!this.ready())return;const lines=[['Year','Month','Currency','Completed Payments','Total Amount','Average Payment','Refunded Payment Amount'],...this.monthly().map(row=>[this.loadedYear(),row.name,this.loadedCurrency(),row.count,row.amount.toFixed(2),row.average.toFixed(2),row.refunded.toFixed(2)]),[this.loadedYear(),'Total',this.loadedCurrency(),this.count(),this.total().toFixed(2),this.average().toFixed(2),this.refunds().toFixed(2)]];const csv=lines.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`payment-report-${this.loadedYear()}-${this.loadedCurrency()}.csv`;link.click();URL.revokeObjectURL(url);}
}
