import { LanguageService } from '../../core/i18n/language.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChatUiRenderer } from './chat-ui-renderer';
import { AdminApi } from '../admin/api/admin.api';
import { PermissionService } from '../../core/auth/permission.service';
import { vi } from 'vitest';

describe('Chat UI whitelist and native orders', () => {
  const orders = vi.fn();
  const inventory = vi.fn();
  beforeEach(() => {
    inventory.mockReset().mockReturnValue(of({items:[{id:3,product_name:'Running shoes',sku:'SHOE-42',stock_status:'LOW_STOCK',quantity:3,available_qty:2,reserved_qty:1,warehouse_location:'Main'}],total:21,pages:3,page:1}));
    orders.mockReset().mockReturnValue(of({items:[{id:7,order_number:'ORD-7',customer_name:'Ada',status:'PENDING',total_amount:25}],total:21,pages:3,page:1}));
    TestBed.configureTestingModule({providers:[provideRouter([]),
      {provide:AdminApi,useValue:{products:()=>of({items:[{id:2,name:'Real astronaut',skus:[],is_active:true}],total:1,pages:1}),payments:()=>of({items:[{id:8,order_number:'ORD-8',status:'PENDING',amount:25,payment_method:'KHQR'}],total:1,pages:1}),orders,searchInventory:inventory,inventorySummary:()=>of({total_products:21,total_stock:100,low_stock:3,out_of_stock:1}),ordersSummary:()=>of({totalOrders:21}),order:()=>of({id:7,order_number:'ORD-7',status:'PENDING',total_amount:25}),orderItems:()=>of([]),paymentByOrder:()=>of(null)}},
      {provide:PermissionService,useValue:{has:()=>true,allows:()=>true}},
    ]});
    TestBed.inject(LanguageService).setLanguage('en');
  });
  it('renders the existing table, filters, paging and embedded View without JSON', async () => {
    const fixture=TestBed.createComponent(ChatUiRenderer);
    fixture.componentRef.setInput('presentation',{schemaVersion:'1.0',blocks:[{kind:'orders.list'}]});
    fixture.detectChanges();
    await fixture.whenStable();fixture.detectChanges();
    const element:HTMLElement=fixture.nativeElement;
    expect(element.querySelector('table')).toBeTruthy();
    expect(element.textContent).toContain('ORD-7');
    expect(element.textContent).toContain('Ada');
    expect(element.textContent).toContain('$25.00');
    expect(element.querySelector('pre,code')).toBeNull();
    expect(element.textContent).not.toContain('"order_number"');
    const next=Array.from(element.querySelectorAll('button')).find(b=>b.textContent?.trim()==='Next')!;
    next.click();fixture.detectChanges();
    expect(orders).toHaveBeenLastCalledWith(2,'',10,false);
    expect(Array.from(element.querySelectorAll('button')).some(b=>b.textContent==='View order')).toBe(true);
    const search=element.querySelector('input[name="search"]') as HTMLInputElement;
    search.value='missing';search.dispatchEvent(new Event('input'));await fixture.whenStable();fixture.detectChanges();
    expect(element.textContent).not.toContain('ORD-7');
  });
  it('opens the existing order detail inside the message and returns to the table', () => {
    const fixture=TestBed.createComponent(ChatUiRenderer);
    fixture.componentRef.setInput('presentation',{schemaVersion:'1.0',blocks:[{kind:'orders.list'}]});
    fixture.detectChanges();
    const button=Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b=>b.textContent==='View order')!;
    button.click();fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-admin-order-detail')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('ORD-7');
    expect(fixture.nativeElement.querySelector('app-admin-orders')).toBeNull();
    (fixture.nativeElement.querySelector('.embedded-ui > button') as HTMLButtonElement).click();fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-admin-orders table')).toBeTruthy();
  });
  it('renders direct order-detail blocks in chat and handles denied access without leaking a record',()=>{
    const fixture=TestBed.createComponent(ChatUiRenderer);
    fixture.componentRef.setInput('presentation',{schemaVersion:'1.0',blocks:[{kind:'orders.detail',entityId:7}]});fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-admin-order-detail')).toBeTruthy();expect(fixture.nativeElement.textContent).toContain('ORD-7');
    fixture.destroy();
    vi.spyOn(TestBed.inject(AdminApi),'order').mockReturnValue(throwError(()=>({status:403})));
    const denied=TestBed.createComponent(ChatUiRenderer);denied.componentRef.setInput('presentation',{schemaVersion:'1.0',blocks:[{kind:'orders.detail',entityId:8}]});denied.detectChanges();
    expect(denied.nativeElement.textContent).not.toContain('ORD-7');expect(denied.nativeElement.querySelector('app-page-access-denied')).toBeTruthy();
  });
  it('keeps date-filtered tool results instead of replacing them with unfiltered orders',()=>{
    const fixture=TestBed.createComponent(ChatUiRenderer);
    const rows=Array.from({length:12},(_,i)=>({id:i+1,order_number:'TODAY-'+(i+1),status:'PROCESSING',total_amount:1}));
    fixture.componentRef.setInput('presentation',{schemaVersion:'1.0',blocks:[{kind:'orders.list',records:rows,date:'2026-10-22'}]});fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2026-10-22');expect(fixture.nativeElement.textContent).toContain('TODAY-1');expect(orders).not.toHaveBeenCalled();
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b=>b.textContent?.trim()==='Next')!.click();fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('TODAY-12');expect(fixture.nativeElement.textContent).not.toContain('ORD-7');expect(orders).not.toHaveBeenCalled();
  });
  it('renders genuine inventory rows and selects the low-stock server filter',()=>{
    const fixture=TestBed.createComponent(ChatUiRenderer);
    fixture.componentRef.setInput('presentation',{schemaVersion:'1.0',blocks:[{kind:'inventory.low-stock'}]});fixture.detectChanges();
    expect(inventory).toHaveBeenCalledWith('','','LOW_STOCK',1,10);
    expect(fixture.nativeElement.querySelector('table').textContent).toContain('SHOE-42');
    expect(fixture.nativeElement.textContent).toContain('Running shoes');
    expect(fixture.nativeElement.textContent).toContain('100');
    expect(fixture.nativeElement.querySelector('pre,code')).toBeNull();
  });
  it('opens real products and payments tables inside the chat workspace',()=>{
    const fixture=TestBed.createComponent(ChatUiRenderer);
    fixture.componentRef.setInput('presentation',{schemaVersion:'1.0',blocks:[{kind:'products.list'},{kind:'payments.list'}]});fixture.detectChanges();
    const select=vi.fn();fixture.componentInstance.selectProduct.subscribe(select);
    expect(fixture.nativeElement.querySelector('app-admin-products-list table')).toBeTruthy();
    fixture.nativeElement.querySelector('[aria-label="Explain product in call"]').click();expect(select).toHaveBeenCalledWith({productId:2});expect(fixture.nativeElement.textContent).toContain('Real astronaut');
    expect(fixture.nativeElement.querySelector('app-admin-payments-list table')).toBeTruthy();expect(fixture.nativeElement.textContent).toContain('ORD-8');expect(fixture.nativeElement.querySelector('pre,code')).toBeNull();
  });
  it('keeps payment tool records scoped to the returned result',()=>{
    const payments=vi.spyOn(TestBed.inject(AdminApi),'payments');const fixture=TestBed.createComponent(ChatUiRenderer);
    fixture.componentRef.setInput('presentation',{schemaVersion:'1.0',blocks:[{kind:'payments.list',records:[{id:9,order_number:'FILTERED-9',status:'PAID',amount:50}]}]});fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('FILTERED-9');expect(fixture.nativeElement.textContent).not.toContain('ORD-8');expect(payments).not.toHaveBeenCalled();
  });
  it('rejects model component names and unsupported schema versions visibly', () => {
    const fixture=TestBed.createComponent(ChatUiRenderer);
    fixture.componentRef.setInput('presentation',{schemaVersion:'1.0',blocks:[{kind:'script',data:'private payload'}]});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('private payload');
    expect(orders).not.toHaveBeenCalled();
    fixture.componentRef.setInput('presentation',{schemaVersion:'2.0',blocks:[{kind:'orders.list'}]});fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('newer interface');expect(orders).not.toHaveBeenCalled();
  });
});
