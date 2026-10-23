import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StorefrontAccessSettings } from './storefront-access-settings';
import { PermissionService } from '../../../core/auth/permission.service';
import { StorefrontAccess } from '../../../core/storefront/storefront-access.service';
const defaults:StorefrontAccess={guestBrowsing:true,guestReviews:false,guestCart:false,guestCheckout:false,guestPayment:false,requireDeliveryAddress:true,requireGuestContactVerification:false,guestOrderTracking:false};
describe('Persisted storefront access settings',()=>{
 let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:PermissionService,useValue:{has:(code:string)=>code==='STOREFRONT_ACCESS_UPDATE'}}]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 function create(){const fixture=TestBed.createComponent(StorefrontAccessSettings);http.expectOne('/api/v1/admin/storefront/access-settings').flush(defaults);fixture.detectChanges();return fixture;}
 it('enforces dependency switches and saves to the backend',()=>{
  const fixture=create(),page=fixture.componentInstance;page.change('guestPayment',true);
  expect(page.settings.guestCart).toBe(true);expect(page.settings.guestCheckout).toBe(true);page.save();
  const request=http.expectOne('/api/v1/admin/storefront/access-settings');expect(request.request.method).toBe('PUT');expect(request.request.body.guestPayment).toBe(true);
  request.flush({...defaults,guestCart:true,guestCheckout:true,guestPayment:true});expect(page.message()).toContain('saved');
  page.change('guestCart',false);expect(page.settings.guestCheckout).toBe(false);expect(page.settings.guestPayment).toBe(false);
 });
 it('keeps the physical address requirement locked on',async()=>{
  const fixture=create();await fixture.whenStable();fixture.detectChanges();const address=fixture.nativeElement.querySelector('input[aria-label="Require delivery address"]') as HTMLInputElement;
  expect(address.disabled).toBe(true);expect(fixture.componentInstance.settings.requireDeliveryAddress).toBe(true);
 });
});
