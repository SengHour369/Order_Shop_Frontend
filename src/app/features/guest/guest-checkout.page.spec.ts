import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { GuestCheckoutPage } from './guest-checkout.page';
import { GuestApi } from '../../core/storefront/guest.api';
import { StorefrontAccessService } from '../../core/storefront/storefront-access.service';
describe('Guest checkout on plain HTTP',()=>{
 afterEach(()=>{vi.unstubAllGlobals();sessionStorage.removeItem('eshop.guest.checkout-key');TestBed.resetTestingModule();});
 it('submits an idempotent checkout without randomUUID or a login',async()=>{
  sessionStorage.removeItem('eshop.guest.checkout-key');
  vi.stubGlobal('crypto',{getRandomValues:crypto.getRandomValues.bind(crypto)});
  const checkout=vi.fn(()=>of({order:{id:12,status:'CONFIRMED'}}));
  TestBed.configureTestingModule({providers:[provideRouter([]),
   {provide:GuestApi,useValue:{cart:()=>of({items:[{id:1}],total_price:14.99}),checkout}},
   {provide:StorefrontAccessService,useValue:{settings:signal({guestCheckout:true})}},
  ]});
  const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  const page=TestBed.createComponent(GuestCheckoutPage).componentInstance;
  await page.submit();
  expect(checkout).toHaveBeenCalledWith(expect.objectContaining({paymentMethod:'CASH_ON_DELIVERY',expectedTotal:14.99,idempotencyKey:expect.stringMatching(/^[A-Za-z0-9_-]{16,100}$/)}));
  expect(navigate).toHaveBeenCalledWith(['/guest/orders',12]);
 });
});
