import { TestBed } from '@angular/core/testing';
import { ActivatedRoute,convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AiImportsApi,ImportBatch } from './ai-imports.api';
import { ApprovalRequestsPage } from './approval-requests.page';
import { PermissionService } from '../../../core/auth/permission.service';
import { AuthService } from '../../../core/auth/auth.service';
describe('Unified request decisions',()=>{
 const batch:ImportBatch={id:'batch',revision:4,status:'SUBMITTED',ownerId:1,lastEditorId:1,assignedReviewerId:2};
 const api={requests:vi.fn(()=>of({items:[batch],total:1,totalPages:1,counts:{SUBMITTED:1}})),preview:vi.fn(()=>of({batch,rows:{content:[],totalPages:1},summary:{statuses:{}},sheets:[],images:[],errors:[]})),history:vi.fn(()=>of({audit:[],approvals:[]})),action:vi.fn((b:ImportBatch,a:string)=>of({...b,status:a==='approve'?'APPROVED':a==='execute'?'COMPLETED':'CHANGES_REQUESTED'}))};
 let actor=2;
 beforeEach(()=>{actor=2;vi.clearAllMocks();TestBed.resetTestingModule();TestBed.configureTestingModule({providers:[{provide:ActivatedRoute,useValue:{snapshot:{data:{mine:false}},queryParamMap:of(convertToParamMap({}))}},{provide:AiImportsApi,useValue:api},{provide:PermissionService,useValue:{has:()=>true}},{provide:AuthService,useValue:{session:()=>({id:actor})}}]});});
 afterEach(()=>TestBed.resetTestingModule());
 async function page(){const page=TestBed.runInInjectionContext(()=>new ApprovalRequestsPage());await new Promise(resolve=>setTimeout(resolve,0));return page;}
 it('prevents maker edits while pending and unlocks returned requests',async()=>{const view=await page();actor=1;expect(view.canEdit(batch)).toBe(false);expect(view.canReview(batch)).toBe(false);expect(view.canEdit({...batch,status:'CHANGES_REQUESTED'})).toBe(true);});
 it('requires a review reason and executes only after an approved server response',async()=>{const view=await page();await view.decide('approve',batch);expect(api.action).not.toHaveBeenCalled();view.reason='Reviewed actual changes';await view.decide('approve',batch);expect(api.action.mock.calls.map(call=>call[1])).toEqual(['approve','execute']);});
 it('returns a request without calling the domain execution action',async()=>{const view=await page();view.reason='Please correct the category';await view.decide('request-changes',batch);expect(api.action.mock.calls.map(call=>call[1])).toEqual(['request-changes']);});
 it('opens validation errors when approval returns an invalid request and does not execute',async()=>{const view=await page();view.reason='Review';api.action.mockReturnValueOnce(of({...batch,status:'INVALID'}));await view.decide('approve',batch);expect(api.action.mock.calls.map(call=>call[1])).toEqual(['approve']);expect(view.tab).toBe('Validation');expect(view.error()).toContain('Validation failed');expect(view.message()).toBe('');});

 it('requires choosing a decision and a nonblank reason before bulk execution',async()=>{const view=await page();view.toggle(batch);view.requestBulk('approve');expect(view.pendingBulk()).toBe('approve');expect(view.reason).toBe('');expect(api.action).not.toHaveBeenCalled();view.reason='   ';await view.confirmBulk();expect(view.decisionError()).toContain('required');expect(api.action).not.toHaveBeenCalled();view.reason='Reviewed the product details';await view.confirmBulk();expect(api.action.mock.calls.map(call=>call[1])).toEqual(['approve','execute']);expect(view.pendingBulk()).toBeNull();});
 it('cancels a selected decision without changing any request',async()=>{const view=await page();view.toggle(batch);view.requestBulk('reject');view.reason='Draft reason';view.cancelBulk();expect(view.pendingBulk()).toBeNull();expect(view.reason).toBe('');expect(api.action).not.toHaveBeenCalled();});
 it('does not open a decision without selected requests',async()=>{const view=await page();view.requestBulk('approve');expect(view.pendingBulk()).toBeNull();expect(api.action).not.toHaveBeenCalled();});

 it('opens the single-request reason dialog before approving and requires confirmation',async()=>{const view=await page();await view.open(batch.id);view.requestDecision('approve');expect(view.pendingBulk()).toBe('approve');expect(view.decisionTarget()?.id).toBe(batch.id);expect(api.action).not.toHaveBeenCalled();await view.confirmBulk();expect(view.decisionError()).toContain('required');expect(api.action).not.toHaveBeenCalled();view.reason='Reviewed product, SKUs and stock';await view.confirmBulk();expect(api.action.mock.calls.map(call=>call[1])).toEqual(['approve','execute']);expect(view.pendingBulk()).toBeNull();});
 it('can return a single request through the same required-reason dialog',async()=>{const view=await page();await view.open(batch.id);view.requestDecision('request-changes');view.reason='Please revise the product description';await view.confirmBulk();expect(api.action.mock.calls.map(call=>call[1])).toEqual(['request-changes']);});

});
