import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CheckoutPage } from './checkout.page';
import { CheckoutAttempt } from './checkout-attempt';
import { AuthService } from '../../core/auth/auth.service';
import { CartApi } from '../cart/cart.api';
import { AddressesApi } from '../addresses/addresses.api';
import { OrdersApi } from '../orders/orders.api';
import { PaymentsApi } from '../payments/payments.api';
import { CatalogApi } from '../catalog/catalog.api';

const address={id:9,recipient_name:'Actual customer',address_line1:'Saved street',city:'Phnom Penh',country:'Cambodia',zip_code:'12000',is_default:true};
const cart={id:1,items:[{id:1,product_sku_id:2,quantity:1,total_price:10}],total_items:1,total_price:10};
describe('Single-page checkout',()=>{
  beforeEach(()=>{TestBed.resetTestingModule();sessionStorage.clear();});
  afterEach(()=>{TestBed.resetTestingModule();sessionStorage.clear();});
  function setup(options:{addresses?:typeof address[];methods?:string[];attempt?:CheckoutAttempt;pending?:Subject<any>}={}){
    const current=vi.fn(()=>of(cart)),load=vi.fn(()=>of(cart));
    const checkout=vi.fn((_body:unknown)=>options.pending||of({id:11,status:'CHECKOUT_PENDING'}));
    const addresses={list:vi.fn(()=>of(options.addresses??[address])),create:vi.fn((body:any)=>of({...body,id:10})),update:vi.fn((id:number,body:any)=>of({...body,id})),remove:vi.fn(()=>of({}))};
    const sku=vi.fn(()=>of({id:4,name:'Actual catalog phone',main_image:['https://example.test/phone.png'],is_active:true,description:'',skus:[{id:2,sku:'PHONE-2',price:10,quantity:3,attributes:[]}]}));
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{userId:()=>7,session:()=>({username:'Customer'})}},
      {provide:CartApi,useValue:{current,load}},{provide:AddressesApi,useValue:addresses},{provide:OrdersApi,useValue:{checkout}},
      {provide:PaymentsApi,useValue:{methods:()=>of(options.methods??['CASH_ON_DELIVERY','KHQR'])}},{provide:CatalogApi,useValue:{forSku:sku}},
      {provide:CheckoutAttempt,useValue:options.attempt||new CheckoutAttempt()}]});
    const fixture=TestBed.createComponent(CheckoutPage);fixture.detectChanges();
    return {fixture,page:fixture.componentInstance,current,load,checkout,addresses,sku};
  }
  it('shows address, payment, real items and Place Order together without checkout steps',()=>{
    const {fixture,checkout}=setup();const text=fixture.nativeElement.textContent;
    expect(text).toContain('Shipping Address');expect(text).toContain('Payment Method');expect(text).toContain('Order Summary');expect(text).toContain('Actual catalog phone');
    expect(fixture.nativeElement.querySelector('.checkout-steps')).toBeNull();
    expect(text).not.toContain('Continue to Payment');expect(text).not.toContain('Express Delivery');
    expect(fixture.nativeElement.querySelector('.place-order').disabled).toBe(false);expect(checkout).not.toHaveBeenCalled();
  });
  it('requires a saved address and supported payment before explicit submission',()=>{
    const {page,checkout}=setup({addresses:[]});page.submit();expect(checkout).not.toHaveBeenCalled();
    page.addressId=123;page.submit();expect(checkout).not.toHaveBeenCalled();
    page.addresses.set([address]);page.addressId=9;page.method='CARD';page.submit();expect(checkout).not.toHaveBeenCalled();
    page.method='KHQR';page.submit();expect(checkout).toHaveBeenCalledOnce();
    expect(checkout.mock.calls[0][0]).toMatchObject({address_id:9,payment_method:'KHQR',expected_total:10,reviewed_items:[{skuId:2,quantity:1}]});
  });
  it('retries a pending checkout with the original key and original selections',()=>{
    const attempt=new CheckoutAttempt();const original=attempt.begin(7,9,'BAKONG','USD');
    const {page,current,load,checkout}=setup({attempt,addresses:[],methods:[]});
    expect(current).toHaveBeenCalledOnce();expect(load).not.toHaveBeenCalled();page.submit();
    expect(checkout).toHaveBeenCalledExactlyOnceWith(original);expect(page.locked()).toBe(true);expect(attempt.read(7)).toEqual(original);
  });
  it('keeps one checkout key after an unknown response and prevents double submission',()=>{
    const pending=new Subject<any>();const {page,checkout}=setup({pending});page.submit();page.submit();expect(checkout).toHaveBeenCalledOnce();
    const original=new CheckoutAttempt().read(7);pending.error({status:0});expect(page.locked()).toBe(true);
    page.submit();expect(checkout.mock.calls[1][0]).toEqual(original);
  });
  it('saves addresses inline and requires confirmation before deleting them',()=>{
    const {page,addresses}=setup({addresses:[]});page.openAddress();page.addressDraft={...address,recipient_name:'New customer'};page.saveAddress();
    expect(addresses.create).toHaveBeenCalledOnce();expect(page.addressId).toBe(10);expect(page.addressForm()).toBe(false);
    page.removeAddress(10);expect(addresses.remove).not.toHaveBeenCalled();page.deleteId.set(10);page.removeAddress(10);expect(addresses.remove).toHaveBeenCalledWith(10);expect(page.addressId).toBe(0);
  });
  it('requires a fresh review after a definitive checkout failure',()=>{
    const pending=new Subject<any>();const {page}=setup({pending});page.submit();pending.next({id:11,status:'FAILED'});pending.complete();
    expect(page.needsRefresh()).toBe(true);expect(page.canSubmit()).toBe(false);expect(new CheckoutAttempt().read(7)).toBeNull();
    page.load();expect(page.canSubmit()).toBe(true);
  });
});
