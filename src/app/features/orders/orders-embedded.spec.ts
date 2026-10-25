import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { OrdersPage } from './orders.page';
import { AuthService } from '../../core/auth/auth.service';

describe('Customer orders embedded in chat',()=>{
  let http:HttpTestingController;
  const session=signal<object|null>({id:7});
  const order={id:30,order_number:'ORD-30',status:'DELIVERED',order_date:'2026-10-22T10:00:00',total_amount:39,paymentMethod:'KHQR',items:[]};
  beforeEach(()=>{session.set({id:7});TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:AuthService,useValue:{session,userId:()=>7}}]});http=TestBed.inject(HttpTestingController);});
  afterEach(()=>{http.match('/api/ai/quota').forEach(r=>r.flush({unlimited:true}));http.verify();});
  function history(page=0,status=''){
    const request=http.expectOne(r=>r.url==='/api/v1/orders/user/history'&&r.params.get('page')===String(page));
    expect(request.request.params.get('userId')).toBe('7');
    expect(request.request.params.get('status')||'').toBe(status);
    request.flush({content:[{data:order}],totalPages:3});
  }
  function create(){const f=TestBed.createComponent(OrdersPage);f.componentRef.setInput('embedded',true);history();f.detectChanges();return f;}
  it('renders owned records as a native table and pages through the scoped API',()=>{
    const f=create(),element:HTMLElement=f.nativeElement;
    expect(element.querySelector('table')?.textContent).toContain('ORD-30');
    expect(element.textContent).toContain('$39.00');expect(element.textContent).toContain('KHQR');
    expect(element.querySelector('pre,code')).toBeNull();
    Array.from(element.querySelectorAll('button')).find(b=>b.textContent==='Next')!.click();history(1);f.detectChanges();expect(element.textContent).toContain('2 / 3');
  });
  it('filters status on the server and resets page-local search and date filters',()=>{
    const f=create();f.componentInstance.page=2;f.componentInstance.filter('PENDING');history(0,'PENDING');
    f.componentInstance.search='missing';expect(f.componentInstance.filtered()).toEqual([]);
    f.componentInstance.search='';f.componentInstance.date='2026-10-21';expect(f.componentInstance.filtered()).toEqual([]);
    f.componentInstance.resetFilters();history();expect(f.componentInstance.filtered()).toHaveLength(1);
  });
  it('opens and closes owned details inside the same chat card',()=>{
    const f=create();Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find(b=>b.textContent==='View Details')!.click();f.detectChanges();
    http.expectOne('/api/v1/orders/user/detail?userId=7&orderId=30').flush({data:order});f.detectChanges();
    expect(f.nativeElement.querySelector('app-chat-order')?.textContent).toContain('ORD-30');
    (f.nativeElement.querySelector('[aria-label="Close order details"]') as HTMLButtonElement).click();f.detectChanges();expect(f.nativeElement.querySelector('app-chat-order')).toBeNull();
  });
  it('requires sign-in and never fetches another customer history for guests',()=>{
    session.set(null);const f=TestBed.createComponent(OrdersPage);f.componentRef.setInput('embedded',true);f.detectChanges();
    http.expectNone(r=>r.url.includes('/orders/user/'));expect(f.nativeElement.querySelector('table')).toBeNull();expect(f.nativeElement.querySelector('app-sign-in-card')).toBeTruthy();
  });
  it('resolves order product names from the actual SKU and allows searching by name',()=>{
    const f=TestBed.createComponent(OrdersPage);f.componentRef.setInput('embedded',true);
    const purchased={...order,customer_id:7,shipping_address_id:5,items:[{id:1,product_sku_id:88,quantity:1,unit_price:39,total_price:39}]};
    http.expectOne(r=>r.url==='/api/v1/orders/user/history').flush({content:[{data:purchased}],totalPages:1});
    http.expectOne('/api/v1/products/sku/88').flush({id:9,name:'Wireless headphones'});
    f.detectChanges();expect(f.componentInstance.productTitle(purchased)).toBe('Wireless headphones');
    f.componentInstance.search='headphones';expect(f.componentInstance.filtered()).toHaveLength(1);
  });

});
