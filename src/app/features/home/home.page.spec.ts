import { StorefrontAccessService } from '../../core/storefront/storefront-access.service';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HomePage } from './home.page';
import { CatalogApi } from '../catalog/catalog.api';
import { AuthService } from '../../core/auth/auth.service';
import { ProductCard } from '../../shared/components/product-card';
@Component({selector:'app-product-card',template:'{{product().name}}'})
class TestProductCard { product = input.required<any>(); }
describe('Guest homepage catalog', () => {
 function create(result: any, guestBrowsing = true) {
  TestBed.configureTestingModule({providers:[provideRouter([]),
   {provide: AuthService,useValue:{session:()=>null}},
   {provide: StorefrontAccessService,useValue:{load:()=>of({guestBrowsing})}},
   {provide: CatalogApi,useValue:{list:()=>result}},
  ]}).overrideComponent(HomePage,{remove:{imports:[ProductCard]},add:{imports:[TestProductCard]}});
  const fixture=TestBed.createComponent(HomePage);fixture.detectChanges();return fixture;
 }
 it('shows products without requiring sign-in',()=>{
  const fixture=create(of({payload:[{id:2,name:'Astronaut Explorer Figure'}]}));
  expect(fixture.nativeElement.querySelector('app-product-card')?.textContent).toContain('Astronaut Explorer Figure');
  expect(fixture.nativeElement.querySelector('app-sign-in-card')).toBeNull();
 });
 it('does not request products or show an error when guest browsing is disabled',()=>{
  const fixture=create(throwError(()=>new Error('Products must not be requested')),false);
  expect(fixture.componentInstance.error()).toBe('');
  expect(fixture.nativeElement.querySelector('app-sign-in-card')).not.toBeNull();
 });
 it('offers sign-in when guest browsing is denied',()=>{
  const fixture=create(throwError(()=>({status:403})));
  expect(fixture.nativeElement.querySelector('app-product-card')).toBeNull();
  expect(fixture.nativeElement.querySelector('app-sign-in-card')).not.toBeNull();
 });
});
