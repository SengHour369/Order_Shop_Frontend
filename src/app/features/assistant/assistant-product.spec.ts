import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AssistantProductCard, AssistantProduct } from './assistant-product';
import { AuthService } from '../../core/auth/auth.service';

describe('Assistant product actions', () => {
  const product: AssistantProduct = { id:8, name:'Laptop', image:'/laptop.png', description:'', skuId:42, price:699, available:3, sku:'LAP-42' };
  beforeEach(() => TestBed.configureTestingModule({ providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:AuthService,useValue:{userId:()=>7,session:()=>({id:7})}}] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('adds the returned SKU rather than the product ID and reports failures', () => {
    const fixture = TestBed.createComponent(AssistantProductCard); fixture.componentRef.setInput('product',product);
    const card = fixture.componentInstance; card.add();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/cart/user/id/items?userId=7');
    expect(request.request.body).toEqual({product_id:42,quantity:1});
    request.flush({}, {status:503,statusText:'Unavailable'});
    expect(card.busy()).toBe(false); expect(card.feedback()).toContain('Could not add');
  });
  it('does not submit unavailable stock or duplicate clicks', () => {
    const fixture = TestBed.createComponent(AssistantProductCard); fixture.componentRef.setInput('product',{...product,available:null});
    fixture.componentInstance.add(); TestBed.inject(HttpTestingController).expectNone(() => true);
    fixture.componentRef.setInput('product',product); fixture.componentInstance.add(); fixture.componentInstance.add();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/cart/user/id/items?userId=7');
    request.flush({message:'Added',code:'OK',data:{total_items:1}});
    expect(fixture.componentInstance.feedback()).toBe('Added to cart');
  });
});
