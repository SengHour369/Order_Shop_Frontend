import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {signal} from '@angular/core';
import {of,throwError} from 'rxjs';
import {CatalogApi} from '../catalog/catalog.api';
import {CartPage} from './cart.page';
import {CartApi} from './cart.api';
import {AuthService} from '../../core/auth/auth.service';
import {CustomerStore} from '../../core/stores/customer.store';
import {StorefrontAccessService} from '../../core/storefront/storefront-access.service';
describe('Mobile cart content',()=>{
 it('shows supplied product metadata, keeps a truthful fallback and retains quantity actions',()=>{
  const cart={id:1,total_price:25,total_items:2,items:[{id:2,product_sku_id:4,quantity:1,total_price:10,product_name:'Actual product',image_url:'/images/example.png'},{id:3,product_sku_id:5,quantity:1,total_price:15}]};
  const api={load:()=>of(cart),update:vi.fn(()=>of(cart)),remove:vi.fn(()=>of(cart))};
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:CartApi,useValue:api},{provide:CatalogApi,useValue:{forSku:(id:number)=>id===4?of({id:44,name:'Actual product',main_image:['/images/example.png'],skus:[{id:4,description:'Blue variant'}]}):throwError(()=>new Error('Unavailable'))}},{provide:AuthService,useValue:{session:()=>({id:1})}},{provide:CustomerStore,useValue:{cartCount:signal(0)}},{provide:StorefrontAccessService,useValue:{settings:signal({guestCheckout:false})}}]});
  const f=TestBed.createComponent(CartPage);f.detectChanges();
  expect(f.nativeElement.querySelector('.cart-item-details h3 a').getAttribute('href')).toBe('/shop/44');expect(f.nativeElement.textContent).toContain('Blue variant');
  expect(f.nativeElement.textContent).toContain('Actual product');expect(f.nativeElement.textContent).toContain('Product SKU #5');expect(f.nativeElement.querySelector('.cart-item-picture img')).toBeTruthy();
  f.nativeElement.querySelector('[aria-label="Increase quantity"]').click();expect(api.update).toHaveBeenCalledWith(2,4,2);
 });
});
