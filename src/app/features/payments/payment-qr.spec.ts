import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentQr } from './payment-qr';
describe('Provider-verified QR payment',()=>{
  let http:HttpTestingController;
  beforeEach(()=>{TestBed.resetTestingModule();TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);});
  afterEach(()=>{try{http.verify();}finally{TestBed.resetTestingModule();}});
  function create(){const f=TestBed.createComponent(PaymentQr);f.componentRef.setInput('orderId',12);f.detectChanges();return f;}
  it('does not assume success when QR is unavailable',async()=>{const f=create();http.expectOne('/api/v1/payments/orders/12/qr').flush({}, {status:503,statusText:'Unavailable'});await Promise.resolve();f.detectChanges();expect(f.nativeElement.textContent).toContain('No payment success has been assumed');expect(f.componentInstance.data()).toBeNull();});
  it('does not render an expired QR and asks the provider to verify',async()=>{
    const f=create();const pending={status:'PENDING',amount:10,currency:'USD',expiresAt:'2020-01-01T00:00:00Z'};
    http.expectOne('/api/v1/payments/orders/12/qr').flush(pending);await Promise.resolve();f.detectChanges();
    http.expectNone('/api/v1/payments/orders/12/qr/image');expect(f.nativeElement.querySelector('img')).toBeNull();
    const checking=f.componentInstance.refresh(true);const req=http.expectOne('/api/v1/payments/orders/12/verify');expect(req.request.method).toBe('POST');expect(req.request.body).toEqual({});req.flush({...pending,status:'SUCCESS'});await checking;f.detectChanges();expect(f.nativeElement.textContent).toContain('Payment verified by Bakong');
  });
});
