import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, Observable, of, switchMap } from 'rxjs';
import { NotificationsApi } from './notifications.api';
import { Notice } from '../../core/api/models';
import { CustomerStore } from '../../core/stores/customer.store';
import { PageState } from '../../shared/utils/page-state';
import { Status } from '../../shared/components/status';
import { Icon } from '../../shared/components/icon';
import { AdminApi, Row, field, text, usd, when } from '../admin/api/admin.api';
@Component({imports:[DatePipe,RouterLink,Status,Icon],templateUrl:'./notification-detail.html',styleUrl:'./notification-detail.scss'})
export class NotificationDetailPage extends PageState {
 private api=inject(NotificationsApi);private orders=inject(AdminApi);private router=inject(Router);private route=inject(ActivatedRoute);private store=inject(CustomerStore);
 id=0;
 notice=signal<Notice|null>(null);order=signal<Row|null>(null);items=signal<Row[]>([]);relatedError=signal('');
 siblings:number[]=this.router.getCurrentNavigation()?.extras.state?.['notificationIds']||[];
 field=field;text=text;usd=usd;when=when;
 constructor(){super();this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params=>this.load(Number(params.get('id'))));}
 load(id:number){
  this.id=id;
  this.notice.set(null);this.order.set(null);this.items.set([]);this.relatedError.set('');
  if(!Number.isSafeInteger(id)||id<1){this.error.set('Invalid notification ID.');return;}
  this.run(this.api.get(id).pipe(switchMap(notice=>{
   this.notice.set(notice);
   if(notice.resourceType?.toUpperCase()!=='ORDER'||!notice.resourceId)return of(null);
   const key=notice.resourceId;
   const request:Observable<Row|null>=/^[1-9]\d*$/.test(key)?this.orders.order(Number(key)):/^[A-Za-z0-9_-]{1,80}$/.test(key)?this.orders.orderByNumber(key):of(null);
   return request.pipe(switchMap(order=>{
    if(!order)return of(null);
    this.order.set(order);const orderId=Number(field(order,'id','order_id'));
    return orderId>0?this.orders.orderItems(orderId):of([]);
   }),catchError(()=>{this.relatedError.set('Related order information could not be loaded.');return of(null);}));
  })),items=>{this.items.set(Array.isArray(items)?items as Row[]:[]);},true);
 }
 markRead(){const n=this.notice();if(!n||n.read||this.busy())return;this.run(this.api.read(n.id),()=>{this.notice.set({...n,read:true});const count=this.store.unread();if(count!==null)this.store.unread.set(Math.max(0,count-1));});}
 neighbor(offset:number){const i=this.siblings.indexOf(this.notice()?.id||0);return i<0?null:this.siblings[i+offset]||null;}
 go(offset:number){const id=this.neighbor(offset);if(id)void this.router.navigate(['/admin/notifications',id],{state:{notificationIds:this.siblings}});}
 type(){return (this.notice()?.type||'Not provided').replaceAll('_',' ').toLowerCase();}
 orderId(){return Number(field(this.order()||{},'id','order_id'));}
}
