import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { WishlistPage } from './wishlist.page';
import { CustomerStore } from '../../core/stores/customer.store';
import { AuthService } from '../../core/auth/auth.service';
import { CartApi } from '../cart/cart.api';
import { Product } from '../../core/api/models';
const product = (id: number, name: string, price: number, category: string): Product => ({ id, name, description:'', main_image:[], is_active:true, skus:[{id:id*10, sku:'SKU-'+id, price, quantity:2, attributes:[{id:1,name:'Category',attributes:[{id:1,value:category}]}]}] });
describe('Wishlist', () => {
 let store: any; let add: ReturnType<typeof vi.fn>; let session: ReturnType<typeof signal<any>>;
 beforeEach(() => {
  const saved = signal([product(1,'Headphones',80,'Audio'),product(2,'Laptop',600,'Electronics'),product(3,'Earbuds',30,'Audio')]);
  store = {saved, savedCount:()=>saved().length, cartCount:signal(0), remove:vi.fn((ids:number[])=>{ saved.update(items=>items.filter(p=>!ids.includes(p.id))); return true; })};
  add=vi.fn(()=>of({total_items:3})); session=signal({id:1});
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:CustomerStore,useValue:store},{provide:AuthService,useValue:{session}},{provide:CartApi,useValue:{add}}]});
 });
 it('combines search/category/sorting without changing saved order',()=>{
  const page=TestBed.createComponent(WishlistPage).componentInstance;
  page.category.set('Audio'); page.sort.set('price'); expect(page.visible().map(p=>p.id)).toEqual([3,1]);
  page.query.set('head'); expect(page.visible().map(p=>p.id)).toEqual([1]); expect(store.saved().map((p:Product)=>p.id)).toEqual([1,2,3]);
 });
 it('selects only visible items and preserves selection if removal cannot persist',()=>{
  const page=TestBed.createComponent(WishlistPage).componentInstance; page.category.set('Audio'); page.selectAll();
  expect(page.selectedIds()).toEqual([1,3]); expect(page.allSelected()).toBe(true);
  store.remove.mockReturnValueOnce(false); page.remove(page.selectedIds()); expect(page.selectedIds()).toEqual([1,3]); expect(page.error()).toBeTruthy();
  page.remove(page.selectedIds()); expect(store.saved().map((p:Product)=>p.id)).toEqual([2]); expect(page.selectedIds()).toEqual([]); expect(page.category()).toBe('');
 });
 it('blocks repeated cart requests and unavailable stock and recovers after failure',()=>{
  const page=TestBed.createComponent(WishlistPage).componentInstance; const result=new Subject<any>(); add.mockReturnValueOnce(result);
  page.add(store.saved()[0]); page.add(store.saved()[0]); expect(add).toHaveBeenCalledTimes(1); result.error(new Error('offline'));
  expect(page.pending().size).toBe(0); expect(page.feedback()[1]).toContain('Unable');
  page.add(store.saved()[0]); expect(store.cartCount()).toBe(3); expect(add).toHaveBeenLastCalledWith(10);
  page.add({...store.saved()[0],is_active:false}); expect(add).toHaveBeenCalledTimes(2);
 });
 it('returns unauthenticated customers to the wishlist after sign in',()=>{
  const page=TestBed.createComponent(WishlistPage).componentInstance; session.set(null); const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  page.add(store.saved()[0]); expect(add).not.toHaveBeenCalled(); expect(navigate).toHaveBeenCalledWith(['/auth'],{queryParams:{returnUrl:'/account/wishlist'}});
 });
 it('renders cards, toggles layout, and shows a filtered empty state',()=>{
  const fixture=TestBed.createComponent(WishlistPage); fixture.detectChanges(); expect(fixture.nativeElement.querySelectorAll('.wish-card')).toHaveLength(3);
  fixture.nativeElement.querySelector('[aria-label="List view"]').click(); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('.list-view')).toBeTruthy();
  fixture.componentInstance.query.set('no match'); fixture.detectChanges(); expect(fixture.nativeElement.querySelectorAll('.wish-card')).toHaveLength(0); expect(fixture.nativeElement.querySelector('.wish-empty')).toBeTruthy();
 });
});
