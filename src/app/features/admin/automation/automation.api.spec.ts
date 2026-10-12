import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AutomationApi, Execution } from './automation.api';
describe('Automation monitoring API',()=>{
  let http:HttpTestingController;let api:AutomationApi;
  beforeEach(()=>{TestBed.resetTestingModule();TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);api=TestBed.inject(AutomationApi);});
  afterEach(()=>{try{http.verify();}finally{TestBed.resetTestingModule();}});
  it('filters payment failures without loading another service',()=>{api.events('payments',2,'DEAD',42).subscribe();http.expectOne('/api/v1/payments/automation/events?page=2&state=DEAD&orderId=42').flush([]);});
  it('retries only the selected event direction through its service',()=>{api.retry('orders',{event_id:'abc',direction:'INBOX'} as Execution).subscribe();const r=http.expectOne('/api/v1/orders/automation/events/abc/retry?direction=INBOX');expect(r.request.method).toBe('POST');r.flush({state:'PENDING'});});
});
