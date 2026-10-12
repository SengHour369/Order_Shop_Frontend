import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CustomerStore } from './customer.store';
import { AuthService } from '../auth/auth.service';
import { Product } from '../api/models';
describe('Wishlist storage',()=>{
 const item:Product={id:1,name:'Item',main_image:[],description:'',is_active:true,skus:[]};
 beforeEach(()=>{ localStorage.clear(); TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{session:signal({id:42})}}]}); });
 afterEach(()=>vi.restoreAllMocks());
 it('persists bulk removal in the current account without changing another account',()=>{
  localStorage.setItem('shopkart.wishlist.9',JSON.stringify([item]));
  const store=TestBed.inject(CustomerStore); TestBed.tick(); store.saved.set([item,{...item,id:2}]);
  expect(store.remove([1])).toBe(true); expect(store.saved().map(p=>p.id)).toEqual([2]);
  expect(JSON.parse(localStorage.getItem('shopkart.wishlist.42')!)).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem('shopkart.wishlist.9')!)).toEqual([item]);
 });
 it('retains saved data when browser storage rejects removal',()=>{
  const store=TestBed.inject(CustomerStore); TestBed.tick(); store.saved.set([item]);
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Storage disabled');});
  expect(store.remove([1])).toBe(false); expect(store.saved()).toEqual([item]);
 });
});
