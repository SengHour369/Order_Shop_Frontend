import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentQr } from '../payments/payment-qr';

describe('Chat KHQR payment authority',()=>{
  let http:HttpTestingController;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);});
  afterEach(()=>{http.verify();TestBed.resetTestingModule();});
  it('shows success only after the fixed payment verification endpoint returns SUCCESS',async()=>{
    const fixture=TestBed.createComponent(PaymentQr);fixture.componentRef.setInput('orderId',30);fixture.detectChanges();
    http.expectOne('/api/v1/payments/orders/30/qr').flush({orderId:30,status:'PENDING',amount:39,currency:'USD',expiresAt:'2020-01-01T00:00:00Z'});
    await Promise.resolve();fixture.detectChanges();expect(fixture.nativeElement.textContent).not.toContain('Payment verified by Bakong.');
    const verify=fixture.componentInstance.refresh(true);http.expectOne('/api/v1/payments/orders/30/verify').flush({orderId:30,status:'SUCCESS',paymentVerified:true,amount:39,currency:'USD',expiresAt:'2020-01-01T00:00:00Z'});
    await verify;fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Payment verified by Bakong.');
  });
  it('does not assume payment success on service failure',async()=>{
    const fixture=TestBed.createComponent(PaymentQr);fixture.componentRef.setInput('orderId',30);fixture.detectChanges();
    http.expectOne('/api/v1/payments/orders/30/qr').flush({}, {status:503,statusText:'Unavailable'});
    await Promise.resolve();http.expectOne('/api/v1/payments/methods').flush(['KHQR']);await Promise.resolve();fixture.detectChanges();expect(fixture.componentInstance.data()).toBeNull();expect(fixture.nativeElement.textContent).not.toContain('Payment verified by Bakong.');
  });
});
