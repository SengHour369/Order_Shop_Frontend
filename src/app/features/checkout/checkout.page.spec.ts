import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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
  it.each(['KHQR','BAKONG','ABA','CASH_ON_DELIVERY'])('opens automatic payment only for QR methods: %s',method=>{
    const pending=new Subject<any>();const {page}=setup({pending,methods:[method]});
    const navigate=vi.spyOn(page.router,'navigate').mockResolvedValue(true);
    page.method=method;page.submit();pending.next({id:11,status:'PENDING'});pending.complete();
    expect(new CheckoutAttempt().orderId(7)).toBe(method==='CASH_ON_DELIVERY'?null:11);
    expect(navigate).toHaveBeenCalledWith(method==='CASH_ON_DELIVERY'?['/orders',11]:['/checkout/payment',11]);
  });
  beforeEach(()=>{TestBed.resetTestingModule();sessionStorage.clear();});
  afterEach(()=>{TestBed.resetTestingModule();sessionStorage.clear();});
  function setup(options:{addresses?:typeof address[];methods?:string[];attempt?:CheckoutAttempt;pending?:Subject<any>}={}){
    const current=vi.fn(()=>of(cart)),load=vi.fn(()=>of(cart));
    const checkout=vi.fn((_body:unknown)=>options.pending||of({id:11,status:'CHECKOUT_PENDING'}));
    const addresses={list:vi.fn(()=>of(options.addresses??[address])),create:vi.fn((body:any)=>of({...body,id:10})),update:vi.fn((id:number,body:any)=>of({...body,id})),remove:vi.fn(()=>of({}))};
    const sku=vi.fn(()=>of({id:4,name:'Actual catalog phone',main_image:['https://example.test/phone.png'],is_active:true,description:'',skus:[{id:2,sku:'PHONE-2',price:10,quantity:3,attributes:[]}]}));
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{userId:()=>7,session:()=>({username:'Customer'})}},
      {provide:CartApi,useValue:{current,load}},{provide:AddressesApi,useValue:addresses},{provide:OrdersApi,useValue:{checkout,detail:()=>of({id:11,status:'PENDING',shipping_address_id:9,paymentMethod:'ABA',items:cart.items,total_amount:10})}},
      {provide:PaymentsApi,useValue:{methods:()=>of(options.methods??['CASH_ON_DELIVERY','KHQR'])}},{provide:CatalogApi,useValue:{forSku:sku}},
      {provide:CheckoutAttempt,useValue:options.attempt||new CheckoutAttempt()}]});
    vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const fixture=TestBed.createComponent(CheckoutPage);fixture.detectChanges();
    return {fixture,page:fixture.componentInstance,current,load,checkout,addresses,sku};
  }
  it.each(['ABA','KHQR'])('opens the QR screen when the customer selects %s and clicks Process Checkout',async method=>{const pending=new Subject<any>();const {page,fixture,checkout}=setup({pending,methods:['CASH_ON_DELIVERY','ABA','KHQR']});await fixture.whenStable();fixture.detectChanges();const radio=(Array.from(fixture.nativeElement.querySelectorAll('.payment-option')).find((label:any)=>label.textContent.includes(method)) as HTMLElement).querySelector('input') as HTMLInputElement;radio.click();fixture.detectChanges();await fixture.whenStable();fixture.nativeElement.querySelector('.place-order').click();expect(checkout).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({payment_method:method}));pending.next({id:11,status:'PENDING',paymentMethod:method});pending.complete();expect(page.router.navigate).toHaveBeenCalledWith(['/checkout/payment',11]);expect(page.router.navigate).not.toHaveBeenCalledWith(['/orders',11]);});
  it('does not silently change a saved KHQR selection to cash when QR is unavailable',()=>{sessionStorage.setItem('eshop.checkout-review.7',JSON.stringify({addressId:9,method:'KHQR'}));const {page,checkout}=setup({methods:['CASH_ON_DELIVERY']});expect(page.method).toBe('KHQR');page.submit();expect(checkout).not.toHaveBeenCalled();expect(page.error()).toContain('unavailable');});
  it('shows one KHQR option when the backend also advertises its BAKONG alias',()=>{const {page}=setup({methods:['CASH_ON_DELIVERY','BAKONG','ABA','KHQR']});expect(page.methods).toEqual(['CASH_ON_DELIVERY','ABA','KHQR']);});
  it('resumes the active order instead of creating another checkout',()=>{const attempt=new CheckoutAttempt();attempt.begin(7,9,'ABA','USD');attempt.attachOrder(7,11);const {page,checkout,load,current}=setup({attempt});expect(page.cart()?.items).toEqual(cart.items);expect(page.method).toBe('ABA');page.submit();expect(page.router.navigate).toHaveBeenCalledWith(['/checkout/payment',11]);expect(load).not.toHaveBeenCalled();expect(current).not.toHaveBeenCalled();expect(checkout).not.toHaveBeenCalled();expect(page.locked()).toBe(true);});
  it('uses the server order QR method to select the payment screen',()=>{const pending=new Subject<any>();const {page}=setup({pending});page.submit();pending.next({id:11,status:'PENDING',paymentMethod:'KHQR'});expect(page.router.navigate).toHaveBeenCalledWith(['/checkout/payment',11]);});
  it('shows address, payment, real items and Process Checkout together without checkout steps',()=>{
    const {fixture,checkout}=setup();const text=fixture.nativeElement.textContent;
    expect(text).toContain('Delivery Address');expect(text).toContain('Payment Method');expect(text).toContain('Order Summary');expect(text).toContain('Actual catalog phone');
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
  it('unlocks a rejected changed cart and requires a fresh review before resubmission',()=>{
    const pending=new Subject<any>();const {page,checkout}=setup({pending});
    page.submit();
    pending.error({status:400,error:{message:'Cart changed. Review again before confirming.'}});
    expect(page.locked()).toBe(false);
    expect(page.needsRefresh()).toBe(true);
    expect(new CheckoutAttempt().read(7)).toBeNull();
    page.submit();expect(checkout).toHaveBeenCalledOnce();
    page.load();expect(page.needsRefresh()).toBe(false);expect(page.canSubmit()).toBe(true);
  });

  it('refreshes changed quantities and totals before creating a checkout key or order',()=>{
    const {page,current,checkout}=setup();
    const updated={...cart,total_items:2,total_price:20,items:[{...cart.items[0],quantity:2,total_price:20}]};
    current.mockReturnValue(of(updated));
    page.submit();
    expect(page.cart()).toEqual(updated);expect(checkout).not.toHaveBeenCalled();
    expect(new CheckoutAttempt().read(7)).toBeNull();expect(page.message()).toContain('Review');
    page.submit();expect(checkout).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({expected_total:20,reviewed_items:[{skuId:2,quantity:2}]}));
  });

});
