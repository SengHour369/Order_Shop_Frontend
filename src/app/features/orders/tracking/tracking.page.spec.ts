import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { TrackingPage } from './tracking.page';
import { OrdersApi } from '../orders.api';
import { AddressesApi } from '../../addresses/addresses.api';
import { Order } from '../../../core/api/models';
import { LanguageService } from '../../../core/i18n/language.service';
const order:Order={id:1,order_number:'ORD-001',status:'DELIVERED',total_amount:179.99,order_date:'2026-10-05T10:24:00',updated_at:'2026-10-07T14:20:00',customer_id:1,shipping_address_id:3,items:[{id:1,product_sku_id:10,quantity:1,unit_price:179.99,total_price:179.99}]};
describe('Order tracking',()=>{
 let detail:ReturnType<typeof vi.fn>;let list:ReturnType<typeof vi.fn>;let params:BehaviorSubject<ReturnType<typeof convertToParamMap>>;
 beforeEach(()=>{
  detail=vi.fn(()=>of(order));list=vi.fn(()=>of([{id:3,address_line1:'Street 271',city:'Phnom Penh',country:'Cambodia',zip_code:'120101',is_default:true}]));params=new BehaviorSubject(convertToParamMap({id:'1'}));
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{paramMap:params}},{provide:OrdersApi,useValue:{detail}},{provide:AddressesApi,useValue:{list}}]});TestBed.inject(LanguageService).setLanguage('en');
 });
 it('renders the reference structure with real order fields and explicit missing courier data',()=>{
  const fixture=TestBed.createComponent(TrackingPage);fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.tracking-step.complete')).toHaveLength(5);
  expect(fixture.nativeElement.querySelectorAll('.tracking-event-row')).toHaveLength(2);
  expect(fixture.nativeElement.textContent).toContain('ORD-001');expect(fixture.nativeElement.textContent).toContain('Street 271');
  expect(fixture.nativeElement.textContent).toContain('Live location unavailable');expect(fixture.nativeElement.textContent).not.toContain('Rithy Sok');
 });
 it('does not fabricate intermediate event dates or a delivered timestamp',()=>{
  const page=TestBed.createComponent(TrackingPage).componentInstance;
  expect(page.events().map(e=>e.date)).toEqual([order.updated_at,order.order_date]);
  expect(page.events()[0].snapshot).toBe(true);page.order.set({...order,updated_at:undefined});expect(page.events()[0].date).toBe('');
 });
 it('does not display cancelled or failed orders as completed shipments',()=>{
  const fixture=TestBed.createComponent(TrackingPage);fixture.componentInstance.order.set({...order,status:'CANCELLED'});fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.tracking-step.complete')).toHaveLength(0);expect(fixture.nativeElement.querySelector('.tracking-notice')).toBeTruthy();
  fixture.componentInstance.order.set({...order,status:'FAILED'});expect(fixture.componentInstance.current()).toBe(-1);
 });
 it('shows only order placement while payment/order processing is pending',()=>{
  const page=TestBed.createComponent(TrackingPage).componentInstance;page.order.set({...order,status:'PENDING'});expect(page.events()).toHaveLength(1);expect(page.current()).toBe(0);
 });
 it('keeps tracking usable when the saved shipping address fails to load',()=>{
  list.mockReturnValueOnce(throwError(()=>new Error('Address offline')));const page=TestBed.createComponent(TrackingPage).componentInstance;
  expect(page.order()).toEqual(order);expect(page.address()).toBe(null);expect(page.addressBusy()).toBe(false);expect(page.error()).toBe('');
 });
 it('replaces outstanding requests when the order route changes',()=>{
  const slow=new Subject<Order>();detail.mockReturnValueOnce(slow);const page=TestBed.createComponent(TrackingPage).componentInstance;
  detail.mockReturnValueOnce(of({...order,id:2,order_number:'ORD-002'}));params.next(convertToParamMap({id:'2'}));slow.next(order);
  expect(page.order()?.id).toBe(2);expect(detail).toHaveBeenLastCalledWith(2);
 });
 it('rejects invalid order IDs and leaves a retry state after API failure',()=>{
  params.next(convertToParamMap({id:'bad'}));const page=TestBed.createComponent(TrackingPage).componentInstance;expect(detail).not.toHaveBeenCalled();expect(page.error()).toBe('Invalid order.');
  detail.mockReturnValueOnce(throwError(()=>new Error('Order unavailable')));params.next(convertToParamMap({id:'2'}));expect(page.error()).toBe('Order unavailable');expect(page.busy()).toBe(false);page.load();expect(page.order()).toEqual(order);
 });
 it('switches static UI copy to Khmer',()=>{
  const fixture=TestBed.createComponent(TrackingPage);TestBed.inject(LanguageService).setLanguage('km');fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('ព័ត៌មានលម្អិតនៃការតាមដាន');
 });
});
