import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CartApi } from './cart.api';
import { AuthService } from '../../core/auth/auth.service';
describe('Cart requests on Wi-Fi HTTP',()=>{
 afterEach(()=>{vi.unstubAllGlobals();TestBed.inject(HttpTestingController).verify();});
 it('adds a SKU with a valid idempotency key without randomUUID',()=>{
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:AuthService,useValue:{userId:()=>7,session:()=>({id:7,access_token:'test'})}}]});
  vi.stubGlobal('crypto',{getRandomValues:crypto.getRandomValues.bind(crypto)});
  const next=vi.fn();TestBed.inject(CartApi).add(12,2).subscribe(next);
  const req=TestBed.inject(HttpTestingController).expectOne(r=>r.url==='/api/v1/cart/user/id/items');
  expect(req.request.params.get('userId')).toBe('7');expect(req.request.body).toEqual({product_id:12,quantity:2});
  expect(req.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
  req.flush({code:'200',data:{items:[],total_items:2,total_price:10}});expect(next).toHaveBeenCalledWith(expect.objectContaining({total_items:2}));
 });
});
