import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { CustomerReturnDetailPage } from './return-detail.page';
import { CustomerReturnsApi, CustomerReturnDetail } from './customer-returns.api';
import { CustomerReturnsPage } from './returns.page';
import { CatalogApi } from '../../catalog/catalog.api';
import { LanguageService } from '../../../core/i18n/language.service';
const record:CustomerReturnDetail={return_id:'RET-1',order_id:1,order_no:'ORD-1',order_date:'2026-10-05T10:00:00',product_id:3,return_type:'REFUND',reason:'No sound',status:'APPROVED',amount:179.99,requested_at:'2026-10-06T10:00:00',history:[{status:'APPROVED',changed_at:'2026-10-07T09:00:00'},{status:'REQUESTED',changed_at:'2026-10-06T10:00:00'}],refund:null};
describe('Customer return details',()=>{
 let detail:ReturnType<typeof vi.fn>;let catalog:ReturnType<typeof vi.fn>;let list:ReturnType<typeof vi.fn>;let params:BehaviorSubject<ReturnType<typeof convertToParamMap>>;
 beforeEach(()=>{
  detail=vi.fn(()=>of(record));catalog=vi.fn(()=>of({id:3,name:'Headphones',main_image:['/headphones.png'],skus:[],description:'',is_active:true}));list=vi.fn(()=>of({content:[record],totalPages:2,totalElements:12}));params=new BehaviorSubject(convertToParamMap({id:'RET-1'}));
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{paramMap:params}},{provide:CustomerReturnsApi,useValue:{detail,list}},{provide:CatalogApi,useValue:{detail:catalog}}]});TestBed.inject(LanguageService).setLanguage('en');
 });
 it('renders the reference cards with real product, request, order and history data',()=>{
  const fixture=TestBed.createComponent(CustomerReturnDetailPage);fixture.detectChanges();const el=fixture.nativeElement;
  expect(el.querySelectorAll('.return-step')).toHaveLength(5);expect(el.querySelectorAll('.return-history li')).toHaveLength(2);
  expect(el.textContent).toContain('Headphones');expect(el.textContent).toContain('No sound');expect(el.textContent).toContain('ORD-1');expect(el.textContent).toContain('No refund record yet');
  expect(el.querySelector('.return-product a').getAttribute('href')).toBe('/shop/3');expect(el.querySelector('.order-information a').getAttribute('href')).toBe('/account/orders/1');
 });
 it('uses actual milestone dates without inventing review, refund or shipping data',()=>{
  const page=TestBed.createComponent(CustomerReturnDetailPage).componentInstance;expect(page.stepDate(0)).toBe(record.requested_at);expect(page.stepDate(1)).toBe(null);expect(page.stepDate(2)).toBe('2026-10-07T09:00:00');expect(page.stepDate(4)).toBe(null);
  expect(page.current()).toBe(2);page.detail.set({...record,status:'COMPLETED',refund:{amount:179.99,status:'PROCESSED',requested_at:record.requested_at,processed_at:'2026-10-09T12:00:00'}});expect(page.current()).toBe(3);expect(page.stepDate(4)).toBe(null);
 });
 it('does not show rejected returns as completed and preserves known history',()=>{
  const fixture=TestBed.createComponent(CustomerReturnDetailPage);fixture.componentInstance.detail.set({...record,status:'REJECTED'});fixture.detectChanges();expect(fixture.nativeElement.querySelectorAll('.return-step.complete')).toHaveLength(0);expect(fixture.nativeElement.querySelector('.return-exception').textContent).toContain('Rejected');
 });
 it('retains request data if the catalog is unavailable',()=>{
  catalog.mockReturnValueOnce(throwError(()=>new Error('Catalog offline')));const page=TestBed.createComponent(CustomerReturnDetailPage).componentInstance;expect(page.detail()?.return_id).toBe('RET-1');expect(page.product()).toBe(null);expect(page.error()).toBe('');
 });
 it('shows return data immediately and prevents stale catalog results replacing the next return',()=>{
  const slow=new Subject<any>();catalog.mockReturnValueOnce(slow);const page=TestBed.createComponent(CustomerReturnDetailPage).componentInstance;
  expect(page.detail()?.return_id).toBe('RET-1');expect(page.busy()).toBe(false);
  detail.mockReturnValueOnce(of({...record,return_id:'RET-2',product_id:4}));catalog.mockReturnValueOnce(of({id:4,name:'Other product',main_image:[],skus:[]}));params.next(convertToParamMap({id:'RET-2'}));slow.next({id:3,name:'Stale product'});expect(page.product()?.id).toBe(4);
 });
 it('handles unauthorized/not-found errors without loading product data and retries',()=>{
  detail.mockReturnValueOnce(throwError(()=>({status:404,error:{message:'Return not found'}})));const page=TestBed.createComponent(CustomerReturnDetailPage).componentInstance;expect(page.detail()).toBe(null);expect(page.error()).toBe('Return not found');expect(catalog).not.toHaveBeenCalled();page.load();expect(page.detail()).toEqual(record);
 });
 it('cancels stale return loads when the route changes and rejects malformed IDs',()=>{
  const slow=new Subject<CustomerReturnDetail>();detail.mockReturnValueOnce(slow);const page=TestBed.createComponent(CustomerReturnDetailPage).componentInstance;detail.mockReturnValueOnce(of({...record,return_id:'RET-2'}));params.next(convertToParamMap({id:'RET-2'}));slow.next(record);expect(page.detail()?.return_id).toBe('RET-2');params.next(convertToParamMap({id:'../../admin'}));expect(page.detail()).toBe(null);expect(page.error()).toBe('Invalid return ID.');
 });
 it('shows only the supplied placement event when history is missing',()=>{
  const page=TestBed.createComponent(CustomerReturnDetailPage).componentInstance;page.detail.set({...record,history:[]});expect(page.history()).toEqual([{status:'REQUESTED',changed_at:record.requested_at}]);
 });
 it('renders Khmer headings',()=>{
  const fixture=TestBed.createComponent(CustomerReturnDetailPage);TestBed.inject(LanguageService).setLanguage('km');fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('ព័ត៌មានលម្អិតនៃការបង្វិលទំនិញ');
 });
 it('paginates the customer return list without exceeding boundaries',()=>{
  const page=TestBed.createComponent(CustomerReturnsPage).componentInstance;expect(page.rows()).toHaveLength(1);page.goto(-1);expect(list).toHaveBeenCalledTimes(1);page.goto(1);expect(list).toHaveBeenLastCalledWith(1);page.goto(2);expect(list).toHaveBeenCalledTimes(2);
 });
});
