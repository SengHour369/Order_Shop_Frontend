import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CheckoutPaymentPage } from './checkout-payment.page';
import { ApiClient } from '../../core/api/api-client';
import { AuthService } from '../../core/auth/auth.service';
import { CheckoutAttempt } from '../checkout/checkout-attempt';
import { OrdersApi } from '../orders/orders.api';
import { CheckoutReview } from '../checkout/checkout-review';

const order={id:11,status:'PENDING',items:[{product_sku_id:2,quantity:1}]};
describe('Checkout payment recovery',()=>{
  afterEach(()=>{TestBed.resetTestingModule();sessionStorage.clear();});
  function setup(status='PENDING',paymentStatus='FAILED'){
    const detail=vi.fn(()=>of({...order,status}));const cancel=vi.fn(()=>of({...order,status:'CANCELLED'}));const restore=vi.fn(()=>Promise.resolve({}));
    const verify=vi.fn(()=>of({status:paymentStatus,paymentVerified:paymentStatus==='SUCCESS'}));
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ApiClient,useValue:{post:verify}},{provide:AuthService,useValue:{userId:()=>7}},{provide:ActivatedRoute,useValue:{snapshot:{paramMap:new Map([['id','11']])}}},{provide:OrdersApi,useValue:{detail,cancel}},{provide:CheckoutReview,useValue:{restore}}]});
    const page=TestBed.runInInjectionContext(()=>new CheckoutPaymentPage());const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    return {page,detail,cancel,restore,navigate,verify};
  }
  it('closes the pending QR screen without cancelling, restoring or treating pending as an error',async()=>{const {page,cancel,restore,navigate,verify}=setup('PENDING','PENDING');await Promise.resolve();await page.leavePayment();expect(navigate).toHaveBeenCalledWith(['/checkout']);expect(TestBed.inject(CheckoutAttempt).orderId(7)).toBe(11);expect(page.error()).toBe('');expect(cancel).not.toHaveBeenCalled();expect(restore).not.toHaveBeenCalled();expect(verify).not.toHaveBeenCalled();});
  it.each(['PENDING','SUCCESS','REVIEW_REQUIRED'])('keeps checkout locked while payment is %s',async status=>{const {page,cancel,restore,navigate}=setup('PENDING',status);await Promise.resolve();await page.returnToCheckout();expect(cancel).not.toHaveBeenCalled();expect(restore).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled();expect(page.error()).toContain('reconciled');});
  it('cancels the pending order, restores the cart, then returns to checkout',async()=>{
    const {page,cancel,restore,navigate}=setup();await Promise.resolve();await page.returnToCheckout();
    expect(cancel).toHaveBeenCalledOnce();expect(restore).toHaveBeenCalledWith(expect.objectContaining({status:'CANCELLED'}));expect(navigate).toHaveBeenCalledWith(['/checkout']);
  });
  it('clears the active checkout only after its order is confirmed',async()=>{const {page}=setup();await Promise.resolve();const attempt=TestBed.inject(CheckoutAttempt);attempt.begin(7,9,'ABA','USD');attempt.attachOrder(7,11);page.complete(12);expect(attempt.read(7)).not.toBeNull();page.complete(11);expect(attempt.read(7)).toBeNull();expect(attempt.orderId(7)).toBeNull();});
  it('does not cancel an order the server already cancelled',async()=>{
    const {page,cancel,restore}=setup('CANCELLED');await Promise.resolve();await page.returnToCheckout();expect(cancel).not.toHaveBeenCalled();expect(restore).toHaveBeenCalledOnce();
  });
  it('stays on the payment screen when cart restoration is not ready',async()=>{
    const {page,restore,navigate}=setup('CANCELLED');restore.mockRejectedValue(new Error('Stock release pending'));await Promise.resolve();await page.returnToCheckout();expect(navigate).not.toHaveBeenCalled();expect(page.error()).toContain('Stock release pending');expect(page.busy()).toBe(false);
  });
  it('does not restore after cancellation fails, such as when payment won the race',async()=>{
    const {page,cancel,restore,navigate}=setup();cancel.mockReturnValue(throwError(()=>new Error('Order is already paid')) as any);await Promise.resolve();await page.returnToCheckout();expect(restore).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled();
  });
});
