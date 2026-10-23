import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of,Subject} from 'rxjs';
import {BranchesPage} from './branches.page';
import {ApiClient} from '../../../core/api/api-client';
import {PermissionService} from '../../../core/auth/permission.service';
describe('Branch management permissions',()=>{
 let admin:boolean;let grants:Set<string>;let api:any;
 beforeEach(()=>{admin=true;grants=new Set(['BRANCH_VIEW','BRANCH_CREATE','BRANCH_ACCESS_MANAGE','INVENTORY_ADJUST']);api={get:vi.fn((path:string)=>of(path.endsWith('/access')?[]:{content:[{id:3,name:'Central',active:true}],totalPages:1})),post:vi.fn(()=>of({id:4,name:'New',active:true})),put:vi.fn(()=>of({userId:8,active:true}))};TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ApiClient,useValue:api},{provide:PermissionService,useValue:{has:(p:string)=>grants.has(p),allows:()=>true,isAdministrator:()=>admin}}]});});
 function setup(){const f=TestBed.createComponent(BranchesPage);f.detectChanges();const page=f.componentInstance;page.select({id:3,name:'Central',address:'City',active:true});f.detectChanges();return {f,page};}
 it('requires a separate reviewed confirmation before granting access',()=>{const {page}=setup();page.prepareGrant(8,true);expect(api.put).not.toHaveBeenCalled();page.confirmGrant();expect(api.put).toHaveBeenCalledWith('/api/v1/branches/3/access',{userId:8,active:true});expect(page.pending()).toBeNull();});
 it('does not allow nonadministrators to grant access or associate inventory',()=>{admin=false;const {page,f}=setup();page.prepareGrant(8,true);page.pending.set({userId:8,active:true});page.confirmGrant();page.inventoryId=7;page.inventoryReview.set(true);page.assignInventory();expect(api.put).not.toHaveBeenCalled();expect(f.nativeElement.textContent).toContain('restricted to authorized administrators');});
 it('rejects missing module permissions even for administrators',()=>{grants.delete('BRANCH_ACCESS_MANAGE');const {page}=setup();page.prepareGrant(8,true);expect(page.pending()).toBeNull();});
 it('requires inventory permission and explicit association review',()=>{const {page}=setup();page.inventoryId=7;page.assignInventory();expect(api.put).not.toHaveBeenCalled();page.inventoryReview.set(true);grants.delete('INVENTORY_ADJUST');page.assignInventory();expect(api.put).not.toHaveBeenCalled();grants.add('INVENTORY_ADJUST');page.assignInventory();expect(api.put).toHaveBeenCalledWith('/api/v1/branches/3/inventory/7');});
 it('blocks duplicate membership writes while a request is pending',()=>{const pending=new Subject<any>();api.put.mockReturnValue(pending);const {page}=setup();page.prepareGrant(8,true);page.confirmGrant();page.confirmGrant();expect(api.put).toHaveBeenCalledTimes(1);});
 it('ignores an old member response after another branch is selected',()=>{const pending=new Subject<any>();const {page}=setup();api.get.mockReturnValueOnce(pending).mockReturnValueOnce(of([{userId:9,active:true}]));page.select({id:3,name:'Central',address:'',active:true});page.select({id:4,name:'West',address:'',active:true});pending.next([{userId:8,active:true}]);expect(page.members().map(m=>m.userId)).toEqual([9]);});
});
