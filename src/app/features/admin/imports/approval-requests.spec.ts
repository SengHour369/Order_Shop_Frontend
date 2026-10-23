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
});
