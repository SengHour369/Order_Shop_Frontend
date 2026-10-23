import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PaymentQr } from './payment-qr';
describe('Provider-verified QR payment',()=>{
  let http:HttpTestingController;
  beforeEach(()=>{TestBed.resetTestingModule();TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);});
  afterEach(()=>{try{http.verify();}finally{TestBed.resetTestingModule();}});
  function create(){const f=TestBed.createComponent(PaymentQr);f.componentRef.setInput('orderId',12);f.detectChanges();return f;}
  it('renders a compact chat receipt only after verified provider success',async()=>{
    const f=create();f.componentRef.setInput('compactReceipt',true);f.componentRef.setInput('orderNumber','ORD-12');
    http.expectOne('/api/v1/payments/orders/12/qr').flush({orderId:12,status:'SUCCESS',paymentVerified:true,amount:39,currency:'USD',provider:'BAKONG',verifiedAt:'2026-10-22T10:00:00Z'});
    await Promise.resolve();f.detectChanges();
    const receipt=f.nativeElement.querySelector('.compact-payment');
    expect(receipt.textContent).toContain('Payment Completed');expect(receipt.textContent).toContain('ORD-12');expect(receipt.textContent).toContain('$39.00');
    expect(f.nativeElement.querySelector('.qr-code-card')).toBeNull();f.destroy();
  });
  it('shows an order-specific QR download and pending progress in chat',async()=>{
    vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=> 'blob:order-12'),revokeObjectURL:vi.fn()}));
    const f=create();f.componentRef.setInput('chatLayout',true);f.componentRef.setInput('orderNumber','ORD-12');
    try{
      http.expectOne('/api/v1/payments/orders/12/qr').flush({orderId:12,status:'PENDING',amount:250,currency:'USD',provider:'BAKONG',expiresAt:new Date(Date.now()+60000).toISOString()});await Promise.resolve();
      http.expectOne('/api/v1/payments/orders/12/qr/image').flush(new Blob(['qr'],{type:'image/png'}));await Promise.resolve();f.detectChanges();
      expect(f.nativeElement.querySelector('.workspace-facts').textContent).toContain('ORD-12');
      expect(f.nativeElement.querySelector('.workspace-facts').textContent).toContain('$250.00');
      expect(f.nativeElement.querySelector('[download]').getAttribute('href')).toBe('blob:order-12');
      expect(f.nativeElement.querySelector('.workspace-status').textContent).toContain('Pending Payment');
      expect(f.nativeElement.textContent).not.toContain('Payment Verified Successfully');
    }finally{f.destroy();vi.unstubAllGlobals();}
  });
  it('keeps chat success separate from order confirmation and rejects unverified success',async()=>{
    const f=create();f.componentRef.setInput('chatLayout',true);
    http.expectOne('/api/v1/payments/orders/12/qr').flush({orderId:12,status:'SUCCESS',paymentVerified:false,amount:250,currency:'USD'});await Promise.resolve();f.detectChanges();
    expect(f.nativeElement.textContent).toContain('needs shop review');expect(f.nativeElement.textContent).not.toContain('Payment Verified Successfully');
    const refresh=f.componentInstance.refresh(true);http.expectOne('/api/v1/payments/orders/12/verify').flush({orderId:12,status:'SUCCESS',paymentVerified:true,amount:250,currency:'USD',orderStatus:'PENDING'});await refresh;f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Payment Verified Successfully');expect(f.nativeElement.textContent).toContain('Order confirmation is pending');f.destroy();
  });
  it('retries automatically while the order QR is still being prepared',async()=>{
    vi.useFakeTimers();const f=create();
    try {
      http.expectOne('/api/v1/payments/orders/12/qr').flush({}, {status:404,statusText:'Not ready'});await Promise.resolve();
      http.expectOne('/api/v1/payments/methods').flush(['CASH_ON_DELIVERY','KHQR']);await Promise.resolve();
      vi.advanceTimersByTime(5000);
      http.expectOne('/api/v1/payments/orders/12/qr').flush({status:'REVIEW_REQUIRED',amount:10,currency:'USD'});await Promise.resolve();
      vi.advanceTimersByTime(5000);http.expectNone('/api/v1/payments/orders/12/qr');
    } finally {f.destroy();vi.useRealTimers();}
  });
  it('stops retrying when KHQR is not configured',async()=>{
    vi.useFakeTimers();const f=create();
    try {
      http.expectOne('/api/v1/payments/orders/12/qr').flush({}, {status:503,statusText:'Service Unavailable'});await Promise.resolve();
      http.expectOne('/api/v1/payments/methods').flush(['CASH_ON_DELIVERY']);await Promise.resolve();f.detectChanges();
      expect(f.nativeElement.textContent).toContain('KHQR is not enabled');
      expect(f.nativeElement.querySelector('button')).toBeNull();
      vi.advanceTimersByTime(15000);http.expectNone('/api/v1/payments/orders/12/qr');
    } finally {f.destroy();vi.useRealTimers();}
  });
  it('does not assume success when QR is unavailable',async()=>{const f=create();http.expectOne('/api/v1/payments/orders/12/qr').flush({}, {status:503,statusText:'Unavailable'});await Promise.resolve();http.expectOne('/api/v1/payments/methods').flush(['KHQR']);await Promise.resolve();f.detectChanges();expect(f.nativeElement.textContent).toContain('No payment success has been assumed');expect(f.componentInstance.data()).toBeNull();});
  it('does not render an expired QR and asks the provider to verify',async()=>{
    const f=create();const pending={status:'PENDING',amount:10,currency:'USD',expiresAt:'2020-01-01T00:00:00Z'};
    http.expectOne('/api/v1/payments/orders/12/qr').flush(pending);await Promise.resolve();f.detectChanges();
    http.expectNone('/api/v1/payments/orders/12/qr/image');expect(f.nativeElement.querySelector('img')).toBeNull();
    const checking=f.componentInstance.refresh(true);const req=http.expectOne('/api/v1/payments/orders/12/verify');expect(req.request.method).toBe('POST');expect(req.request.body).toEqual({});req.flush({...pending,status:'SUCCESS',paymentVerified:true});await checking;f.detectChanges();expect(f.nativeElement.textContent).toContain('Payment verified by Bakong');
  });
  it('automatically verifies pending payments and stops after provider success',async()=>{
    vi.useFakeTimers();vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=> 'blob:qr'),revokeObjectURL:vi.fn()}));
    const f=create();
    try{
      const pending={status:'PENDING',amount:10,currency:'USD',expiresAt:new Date(Date.now()+60000).toISOString()};
      http.expectOne('/api/v1/payments/orders/12/qr').flush(pending);await Promise.resolve();
      http.expectOne('/api/v1/payments/orders/12/qr/image').flush(new Blob(['qr'],{type:'image/png'}));await Promise.resolve();
      const verified=vi.fn();f.componentInstance.verified.subscribe(verified);
      vi.advanceTimersByTime(5000);
      http.expectOne('/api/v1/payments/orders/12/verify').flush({...pending,status:'SUCCESS',paymentVerified:true});await Promise.resolve();f.detectChanges();
      expect(verified).toHaveBeenCalledWith(12);expect(f.nativeElement.textContent).toContain('Payment verified by Bakong');
      vi.advanceTimersByTime(10000);http.expectNone('/api/v1/payments/orders/12/verify');
    }finally{f.destroy();vi.useRealTimers();vi.unstubAllGlobals();}
  });

  it('keeps an expired QR pending and continues reconciliation beyond two minutes',async()=>{
    vi.useFakeTimers();const f=create();f.componentRef.setInput('checkoutFlow',true);
    try{
      const pending={status:'PENDING',amount:10,currency:'USD',expiresAt:new Date(Date.now()-180000).toISOString()};
      http.expectOne('/api/v1/payments/orders/12/qr').flush(pending);await Promise.resolve();f.detectChanges();
      expect(f.componentInstance.failed()).toBe(false);expect(f.nativeElement.textContent).toContain('Payment reconciliation pending');expect(f.nativeElement.textContent).not.toContain('Payment Failed');
      vi.advanceTimersByTime(5000);http.expectOne('/api/v1/payments/orders/12/verify').flush(pending);await Promise.resolve();
      vi.advanceTimersByTime(5000);http.expectOne('/api/v1/payments/orders/12/verify').flush({...pending,status:'FAILED'});await Promise.resolve();f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Return to Checkout');expect(f.nativeElement.textContent).toContain('Try Again');
    }finally{f.destroy();vi.useRealTimers();}
  });
  it('waits for authoritative order confirmation before completing checkout',async()=>{
    vi.useFakeTimers();const f=create();f.componentRef.setInput('checkoutFlow',true);const verified=vi.fn();f.componentInstance.verified.subscribe(verified);
    try{
      const paid={status:'SUCCESS',paymentVerified:true,amount:10,currency:'USD',orderStatus:'PENDING'};
      http.expectOne('/api/v1/payments/orders/12/qr').flush(paid);await Promise.resolve();f.detectChanges();
      expect(verified).not.toHaveBeenCalled();expect(f.nativeElement.textContent).toContain('The shop is confirming your order');
      vi.advanceTimersByTime(5000);http.expectOne('/api/v1/payments/orders/12/qr').flush({...paid,orderStatus:'PROCESSING'});await Promise.resolve();f.detectChanges();
      expect(verified).toHaveBeenCalledExactlyOnceWith(12);expect(f.nativeElement.textContent).toContain('Your order has been confirmed');
    }finally{f.destroy();vi.useRealTimers();}
  });

  it('requires review when verified payment belongs to a cancelled order',async()=>{const f=create();const verified=vi.fn();f.componentInstance.verified.subscribe(verified);http.expectOne('/api/v1/payments/orders/12/qr').flush({status:'SUCCESS',paymentVerified:true,orderStatus:'CANCELLED',amount:10,currency:'USD'});await Promise.resolve();f.detectChanges();expect(f.componentInstance.data()?.status).toBe('REVIEW_REQUIRED');expect(verified).not.toHaveBeenCalled();expect(f.nativeElement.textContent).toContain('Do not pay again');f.destroy();});
  it('does not announce payment success without the verified flag',async()=>{
    const f=create();const verified=vi.fn();f.componentInstance.verified.subscribe(verified);
    http.expectOne('/api/v1/payments/orders/12/qr').flush({status:'SUCCESS',amount:10,currency:'USD',paymentVerified:false});
    await Promise.resolve();f.detectChanges();expect(f.componentInstance.data()?.status).toBe('REVIEW_REQUIRED');expect(verified).not.toHaveBeenCalled();expect(f.nativeElement.textContent).toContain('Do not pay again');f.destroy();
  });

});
