import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PermissionService } from '../../../core/auth/permission.service';
import { PageState } from '../../../shared/utils/page-state';
import { Icon } from '../../../shared/components/icon';
import { Status } from '../../../shared/components/status';
import { AdminApi, field, Row, text, usd } from '../api/admin.api';
@Component({imports: [PageAccessDenied, CanAccessDirective, DatePipe,FormsModule,RouterLink,Icon,Status],templateUrl:'./groups.html',styleUrl:'./groups.css'})
export class GroupsPage extends PageState {
 access=inject(PermissionService);private api=inject(AdminApi);
 rows=signal<Row[]>([]);query=signal('');statusFilter=signal('');typeFilter=signal('');page=signal(1);size=signal(10);filtersOpen=false;createdAfter=signal('');
 field=field;text=text;usd=usd;
 types=computed(()=>[...new Set(this.rows().map(row=>String(field(row,'type')||'Default')))].sort());
 filtered=computed(()=>this.rows().filter(row=>{
  const q=this.query().trim().toLowerCase();
  return (!q||`${field(row,'group_name','name','groupName')} ${field(row,'description')}`.toLowerCase().includes(q))&&(!this.statusFilter()||(this.statusFilter()==='active')===this.activeRow(row))&&(!this.typeFilter()||String(field(row,'type')||'Default')===this.typeFilter())&&(!this.createdAfter()||String(field(row,'created_at','createdAt')).slice(0,10)>=this.createdAfter());
 }));
 activeCount=computed(()=>this.rows().filter(row=>this.activeRow(row)).length);
 pages=computed(()=>Math.max(1,Math.ceil(this.filtered().length/this.size())));
 visible=computed(()=>this.filtered().slice((this.page()-1)*this.size(),this.page()*this.size()));
 constructor(){super();this.load();}
 load(){this.run(this.api.allGroups(),rows=>{this.rows.set(rows);this.page.set(Math.min(this.page(),this.pages()));});}
 activeRow(row:Row){return field(row,'is_active','isActive')!==false&&!['BLK','INACTIVE','DISABLED'].includes(String(field(row,'status')).toUpperCase());}
 change(){this.page.set(1);}
 goto(page:number){if(!this.busy()&&page>=1&&page<=this.pages())this.page.set(page);}
 metric(row:Row,...keys:string[]){const value=field(row,...keys);return value===''||value===null||value===undefined?'—':Number(value).toLocaleString();}
 totalMetric(...keys:string[]){if(!this.rows().length)return '—';const values=this.rows().map(row=>field(row,...keys));if(values.some(value=>value===''||value===null||value===undefined||!Number.isFinite(Number(value))))return '—';return values.reduce<number>((sum,value)=>sum+Number(value),0).toLocaleString();}
 totalSpent(){const value=this.totalMetric('total_spent','totalSpent');return value==='—'?value:usd(Number(value.replaceAll(',','')));}
 spent(row:Row){const value=field(row,'total_spent','totalSpent');return value===''||value===undefined||value===null?'—':usd(value);}
 date(row:Row){const value=String(field(row,'created_at','createdAt'));return Number.isFinite(Date.parse(value))?value:null;}
 icon(row:Row){const type=String(field(row,'type')).toUpperCase();return type==='VIP'?'crown':type==='WHOLESALE'?'bag':type==='SEGMENT'?'pin':'user';}
 remove(row:Row){if(this.busy()||!this.access.has('USER_GROUP_DELETE')||!confirm('Delete this group?'))return;this.run(this.api.deleteGroup(Number(field(row,'group_id','id'))),()=>{this.load();this.message.set('Group deleted.');});}
 export(){
  const rows=[['Group Name','Description','Group Type','Customers','Orders','Total Spent','Status','Created At'],...this.filtered().map(row=>[field(row,'group_name','name','groupName'),field(row,'description'),field(row,'type'),this.metric(row,'total_customers','totalCustomers'),this.metric(row,'total_orders','totalOrders'),this.spent(row),this.activeRow(row)?'Active':'Inactive',field(row,'created_at','createdAt')])];
  const csv=rows.map(row=>row.map(value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='customer-groups.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
