import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {ApiClient} from '../../../core/api/api-client';
import {GuestReviewModerationPage} from './guest-review-moderation.page';
describe('Review moderation filters and decisions',()=>{
 let get:ReturnType<typeof vi.fn>,put:ReturnType<typeof vi.fn>;
 beforeEach(()=>{get=vi.fn(()=>of({content:[{id:'1',moderationStatus:'PENDING'}],last:true,totalElements:1,totalPages:1,counts:{ALL:5,PENDING:1,APPROVED:3,REJECTED:1}}));put=vi.fn(()=>of({}));TestBed.configureTestingModule({providers:[{provide:ApiClient,useValue:{get,put}}]});});
 afterEach(()=>TestBed.resetTestingModule());
 const create=()=>TestBed.runInInjectionContext(()=>new GuestReviewModerationPage());
 it('uses server totals and sends all applied filters',()=>{const page=create();expect(page.count('ALL')).toBe(5);page.search='  Trail  ';page.rating='5';page.type='GUEST';page.from='2026-10-01';page.to='2026-10-25';page.apply();expect(get).toHaveBeenLastCalledWith('/api/v1/admin/guest-reviews',{page:0,status:'ALL',search:'Trail',rating:'5',type:'GUEST',from:'2026-10-01',to:'2026-10-25'});page.pick('APPROVED');expect(page.applied.status).toBe('APPROVED');expect(page.applied.search).toBe('Trail');});
 it('blocks invalid dates and prevents negative pagination',()=>{const page=create();get.mockClear();page.from='2026-10-25';page.to='2026-10-01';page.apply();expect(get).not.toHaveBeenCalled();expect(page.error()).toContain('end date');page.changePage(-1);expect(page.page).toBe(0);});
 it('refreshes authoritative counts after moderation and rejects non-pending actions',()=>{const page=create();page.decide('1','APPROVED');expect(put).toHaveBeenCalledWith('/api/v1/admin/guest-reviews/1',{status:'APPROVED'});expect(get).toHaveBeenCalledTimes(2);page.reviews.set([{id:'2',moderationStatus:'APPROVED'} as any]);page.decide('2','REJECTED');expect(put).toHaveBeenCalledTimes(1);});
});
