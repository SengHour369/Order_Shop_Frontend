import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../core/auth/auth.service';
import { ChatOrder } from './chat-order';

describe('Owned order operations inside chat',()=>{
  let http:HttpTestingController;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:AuthService,useValue:{session:signal({id:7}),userId:()=>7}}]});http=TestBed.inject(HttpTestingController);});
  afterEach(()=>{http.match('/api/ai/quota').forEach(r=>r.flush({unlimited:true,remaining:5,used:0,dailyLimit:5}));http.verify();});
  function create(){const fixture=TestBed.createComponent(ChatOrder);fixture.componentRef.setInput('orderId',30);fixture.detectChanges();http.expectOne('/api/v1/orders/user/detail?userId=7&orderId=30').flush({data:{id:30,order_number:'ORD-30',status:'PENDING',total_amount:39,items:[],order_date:'2026-10-16T10:00:00'}});return fixture;}
  it('requires explicit cancellation confirmation and refreshes authoritative order state',()=>{
    const fixture=create(), component=fixture.componentInstance;
    http.expectNone(r=>r.url.includes('/confirm/'));
    component.prepareCancel();const prepare=http.expectOne('/api/ai/tools/ORDER_CANCEL');expect(prepare.request.body).toEqual({orderNumber:'ORD-30'});
    prepare.flush({status:'NEEDS_INPUT',errorCode:'CONFIRMATION_REQUIRED',message:'Confirm cancellation',data:{confirmationId:'confirm-30'}});
    http.expectNone('/api/ai/confirm/confirm-30');
    component.confirmCancel();http.expectOne('/api/ai/confirm/confirm-30').flush({status:'SUCCESS',message:'Cancelled'});
    http.expectOne('/api/v1/orders/user/detail?userId=7&orderId=30').flush({data:{id:30,order_number:'ORD-30',status:'CANCELLED',total_amount:39,items:[]}});
    expect(component.order()?.status).toBe('CANCELLED');expect(component.confirmation()).toBeNull();
  });
  it('renders the reference card with genuine item totals and no invented shipment dates',()=>{
    const fixture=create();fixture.detectChanges();
    const element:HTMLElement=fixture.nativeElement;
    expect(element.querySelector('.order-heading')?.textContent).toContain('ORD-30');
    expect(element.querySelector('.order-facts')?.textContent).toContain('$39.00');
    expect(element.querySelector('.timeline')?.textContent).toContain('Order placed');
    expect(element.querySelector('.timeline')?.textContent).not.toContain('May 28');
    expect(element.querySelector('.order-actions')?.textContent).toContain('Payment status');
    expect(element.querySelector('pre,code')).toBeNull();
  });
  it('resolves shipping only from the signed-in customer address list',()=>{
    const fixture=TestBed.createComponent(ChatOrder);fixture.componentRef.setInput('orderId',30);fixture.detectChanges();
    http.expectOne('/api/v1/orders/user/detail?userId=7&orderId=30').flush({data:{id:30,order_number:'ORD-30',status:'DELIVERED',total_amount:39,shipping_address_id:5,items:[]}});
    http.expectOne('/api/v1/addresses/user/7').flush([{data:{id:5,address_line1:'Street 1',city:'Phnom Penh',country:'Cambodia'}},{data:{id:6,address_line1:'Other address'}}]);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('address').textContent).toContain('Street 1');
    expect(fixture.nativeElement.querySelector('address').textContent).not.toContain('Other address');
  });
  it('does not invent order status when ownership is rejected',()=>{
    const fixture=TestBed.createComponent(ChatOrder);fixture.componentRef.setInput('orderId',31);fixture.detectChanges();
    http.expectOne('/api/v1/orders/user/detail?userId=7&orderId=31').flush({}, {status:403,statusText:'Forbidden'});
    expect(fixture.componentInstance.order()).toBeNull();expect(fixture.componentInstance.error()).toContain('Could not retrieve');
  });
});
