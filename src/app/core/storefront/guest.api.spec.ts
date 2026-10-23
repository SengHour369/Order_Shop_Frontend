import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GuestApi } from './guest.api';
import { CartApi } from '../../features/cart/cart.api';
import { AuthService } from '../auth/auth.service';

describe('Guest commerce API', () => {
  let http: HttpTestingController;
  beforeEach(() => {TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);});
  afterEach(() => http.verify());
  const cart={id:1,total_items:1,total_price:20,items:[]};
  function bootstrap() {const req=http.expectOne('/api/v1/guest/session');expect(req.request.method).toBe('POST');req.flush({csrfToken:'server-csrf',expiresAt:new Date(Date.now()+60000).toISOString()});}
  it('uses an opaque cookie session and CSRF header without supplying an owner', () => {
    TestBed.inject(CartApi).add(9,2).subscribe();bootstrap();
    const req=http.expectOne('/api/v1/guest/cart/items');expect(req.request.headers.get('X-Guest-CSRF')).toBe('server-csrf');
    expect(req.request.body).toEqual({product_id:9,quantity:2});expect(req.request.params.has('userId')).toBe(false);
    req.flush({code:'200',message:'OK',data:cart});
  });
  it('bootstraps once for concurrent guest requests', () => {
    const api=TestBed.inject(GuestApi);api.cart().subscribe();api.orders().subscribe();bootstrap();
    http.expectOne('/api/v1/guest/cart').flush({code:'200',data:cart});http.expectOne('/api/v1/guest/orders').flush([]);
  });
  it('keeps scoped order credentials out of URLs and request bodies', () => {
    TestBed.inject(GuestApi).order(8,'scoped-secret').subscribe();bootstrap();
    const req=http.expectOne('/api/v1/guest/orders/8');expect(req.request.headers.get('X-Guest-Order-Token')).toBe('scoped-secret');
    expect(req.request.urlWithParams).not.toContain('scoped-secret');req.flush({id:8});
  });
  it('preserves the registered customer cart endpoint', () => {
    TestBed.inject(AuthService).accept({id:7,username:'customer',email:'c@example.test',role:'USER',access_token:'token',refresh_token:'refresh'});
    TestBed.inject(CartApi).add(9,2).subscribe();
    const req=http.expectOne('/api/v1/cart/user/id/items?userId=7');expect(req.request.body).toEqual({product_id:9,quantity:2});
    req.flush({code:'200',data:cart});http.expectNone('/api/v1/guest/session');
  });
});
