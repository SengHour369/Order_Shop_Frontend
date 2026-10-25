import {TestBed} from '@angular/core/testing';
import {ActivatedRoute,convertToParamMap,provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {OrderPage} from './order.page';
import {OrdersApi} from './orders.api';
import {CatalogApi} from '../catalog/catalog.api';
import {AddressesApi} from '../addresses/addresses.api';
describe('Order detail product heading',()=>{
  it('uses actual product names instead of the order code and reuses SKU lookups',()=>{
    const forSku=vi.fn(()=>of({id:3,name:'Wireless headphones'}));
    TestBed.configureTestingModule({providers:[provideRouter([]),
      {provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({id:1}),queryParamMap:convertToParamMap({})}}},
      {provide:OrdersApi,useValue:{detail:()=>of({id:1,order_number:'ORD-long-code',shipping_address_id:2,items:[{id:1,product_sku_id:10},{id:2,product_sku_id:10}]})}},
      {provide:CatalogApi,useValue:{forSku}},{provide:AddressesApi,useValue:{detail:()=>of({id:2})}}]});
    const page=TestBed.createComponent(OrderPage).componentInstance;
    expect(page.productTitle()).toBe('Wireless headphones');expect(page.productNames()[10]).toBe('Wireless headphones');
    page.load();expect(forSku).toHaveBeenCalledOnce();
  });
});
