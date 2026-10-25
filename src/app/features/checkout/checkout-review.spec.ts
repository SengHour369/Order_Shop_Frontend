import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CheckoutAttempt } from './checkout-attempt';
import { CheckoutReview } from './checkout-review';
import { CartApi } from '../cart/cart.api';
import { AuthService } from '../../core/auth/auth.service';
import { Order } from '../../core/api/models';
const order={id:11,status:'CANCELLED',items:[{product_sku_id:2,quantity:2}]} as Order;
describe('Restoring failed checkout',()=>{
 afterEach(()=>{TestBed.resetTestingModule();sessionStorage.clear();});
 function setup(quantity=0){const items=quantity?[{product_sku_id:2,quantity}]:[];const cart={items,total_price:10};const load=vi.fn(()=>of(cart));const add=vi.fn((_sku:number,_quantity:number,_key:string)=>of({...cart,items:[{product_sku_id:2,quantity:2}]}));TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{userId:()=>7}},{provide:CartApi,useValue:{load,add}}]});return {review:TestBed.inject(CheckoutReview),load,add};}
 it('adds only missing quantities and uses an idempotency key',async()=>{const {review,add}=setup(1);await review.restore(order);expect(add).toHaveBeenCalledWith(2,1,expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
 const originalKey=add.mock.calls[0][2];await review.restore(order);expect(add.mock.calls[1][2]).toBe(originalKey);});
 it('releases the old checkout identity only after cart restoration succeeds',async()=>{const {review}=setup(2);const attempt=TestBed.inject(CheckoutAttempt);attempt.begin(7,9,'ABA','USD');attempt.attachOrder(7,11);await review.restore(order);expect(attempt.read(7)).toBeNull();expect(attempt.orderId(7)).toBeNull();});
 it('does not duplicate items already restored',async()=>{const {review,add}=setup(2);await review.restore(order);expect(add).not.toHaveBeenCalled();});
 it('refuses to restore a paid or still pending order',async()=>{const {review,load}=setup();await expect(review.restore({...order,status:'PROCESSING'})).rejects.toThrow();await expect(review.restore({...order,status:'PENDING'})).rejects.toThrow();expect(load).not.toHaveBeenCalled();});
 it('keeps selected address and payment method for return to checkout',()=>{const {review}=setup();review.save(9,'ABA');expect(review.read()).toEqual({addressId:9,method:'ABA'});});
});
