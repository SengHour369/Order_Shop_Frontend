import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationDetailPage } from './notification-detail.page';
import { NotificationsApi } from './notifications.api';
import { AdminApi } from '../admin/api/admin.api';
import { CustomerStore } from '../../core/stores/customer.store';
describe('Notification details',()=>{
 const notice={id:4,title:'Order received',message:'An order was placed.',type:'ORDER_CREATED',resourceType:'ORDER',resourceId:'12',createdAt:'2026-10-17T09:00:00Z',read:false};
 let api:any,orders:any,unread:ReturnType<typeof signal<number|null>>;
 beforeEach(()=>{
  api={get:vi.fn(()=>of(notice)),read:vi.fn(()=>of(undefined))};
  orders={order:vi.fn(()=>of({id:12,order_number:'ORD-12',total_amount:45})),orderByNumber:vi.fn(),orderItems:vi.fn(()=>of([{product_name:'Headphones',quantity:1}]))};
  unread=signal<number|null>(2);
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{paramMap:of(convertToParamMap({id:'4'}))}},{provide:NotificationsApi,useValue:api},{provide:AdminApi,useValue:orders},{provide:CustomerStore,useValue:{unread}}]});
 });
 function setup(){const fixture=TestBed.createComponent(NotificationDetailPage);fixture.detectChanges();return {page:fixture.componentInstance,fixture};}
 it('loads notification, related order, and items from their APIs',()=>{
  const {page,fixture}=setup();expect(api.get).toHaveBeenCalledWith(4);expect(orders.order).toHaveBeenCalledWith(12);expect(orders.orderItems).toHaveBeenCalledWith(12);expect(page.items()).toHaveLength(1);expect(fixture.nativeElement.textContent).toContain('Headphones');expect(api.read).not.toHaveBeenCalled();
 });
 it('keeps the notification visible when related order lookup fails',()=>{
  orders.order.mockReturnValue(throwError(()=>new Error('Unavailable')));const {page}=setup();expect(page.notice()?.title).toBe('Order received');expect(page.relatedError()).toContain('could not be loaded');expect(page.error()).toBe('');
 });
 it('marks read and updates the count only after API success',()=>{
  api.read.mockReturnValueOnce(throwError(()=>new Error('Offline')));const {page}=setup();page.markRead();expect(page.notice()?.read).toBe(false);expect(unread()).toBe(2);page.markRead();expect(page.notice()?.read).toBe(true);expect(unread()).toBe(1);
 });
 it('does not send untrusted resource IDs to an order endpoint',()=>{
  api.get.mockReturnValue(of({...notice,resourceId:'https://example.com'}));setup();expect(orders.order).not.toHaveBeenCalled();expect(orders.orderByNumber).not.toHaveBeenCalled();
 });
});
