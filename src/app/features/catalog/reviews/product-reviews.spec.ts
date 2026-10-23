import { LanguageService } from '../../../core/i18n/language.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProductReviews, ProductReview } from './product-reviews';
const rows: ProductReview[] = [
 {id:'1',author:'David K.',rating:5,title:'Amazing sound',body:'Comfortable headphones.',createdAt:'2026-10-02T12:00:00Z',verifiedPurchase:true,photos:['/photo.png'],helpfulCount:24},
 {id:'2',author:'Sophie L.',rating:4,title:'Great headphones',body:'Good battery.',createdAt:'2026-10-04T12:00:00Z',verifiedPurchase:false,photos:[],helpfulCount:12},
];
describe('Product reviews',()=>{
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});TestBed.inject(LanguageService).setLanguage('en');});
 it('shows unavailable rather than fabricated ratings and disables persistence actions',()=>{
  const fixture=TestBed.createComponent(ProductReviews);fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Reviews are currently unavailable.');
  expect(fixture.nativeElement.querySelector('.average-rating strong').textContent).toBe('—');
  expect(fixture.nativeElement.querySelector('.write-review').disabled).toBe(true);
 });
 it('calculates ratings from supplied reviews and combines search, photo and star filters',()=>{
  const fixture=TestBed.createComponent(ProductReviews);fixture.componentRef.setInput('reviews',rows);fixture.componentRef.setInput('available',true);fixture.detectChanges();
  const page=fixture.componentInstance;
  expect(page.average()).toBe(4.5);expect(page.withPhotos()).toBe(1);
  expect(page.distribution()[0].percent).toBe(50);
  page.photosOnly.set(true);page.rating.set(5);page.search.set(' DAVID ');
  expect(page.filtered().map(row=>row.id)).toEqual(['1']);
  page.search.set('battery');expect(page.filtered()).toHaveLength(0);
  page.reset();expect(page.filtered()).toHaveLength(2);
 });
 it('sorts without modifying supplied records and displays only authoritative purchase badges',()=>{
  const fixture=TestBed.createComponent(ProductReviews);fixture.componentRef.setInput('reviews',rows);fixture.componentRef.setInput('available',true);fixture.detectChanges();
  const page=fixture.componentInstance;
  expect(page.filtered()[0].id).toBe('2');page.sort.set('helpful');expect(page.filtered()[0].id).toBe('1');
  expect(rows[0].id).toBe('1');
  expect(fixture.nativeElement.querySelectorAll('.verified')).toHaveLength(1);
  expect(fixture.nativeElement.querySelectorAll('.review-photos img')).toHaveLength(1);
 });
});
