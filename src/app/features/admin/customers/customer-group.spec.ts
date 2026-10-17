import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { PermissionService } from '../../../core/auth/permission.service';
import { CustomerGroupPage } from './customer-group.page';
function setup() {
  const api = {
    allPermissionRows: vi.fn(() => of([{ func_id: 1, func_name: 'View Products', is_active: true, module: 'Products' }])),
    saveGroup: vi.fn((_body: object, _id?: number) => of({ group_id: 12 })),
    createPermissionRow: vi.fn((_resource: string, _params: object) => of({ group_permission_id: 55 })),
    deletePermissionRow: vi.fn(() => of({})),
  };
  TestBed.configureTestingModule({providers:[provideRouter([]), {provide: AdminApi, useValue: api}, {provide: PermissionService, useValue:{has:()=>true}}, {provide: ActivatedRoute, useValue:{paramMap:of(convertToParamMap({}))}}]});
  const router = TestBed.inject(Router); vi.spyOn(router,'navigate').mockResolvedValue(true);
  const page = TestBed.runInInjectionContext(() => new CustomerGroupPage());
  page.name='VIP Customers';page.code='VIP';page.type='VIP';page.description='Premium benefits';
  return {page,api,router};
}
describe('Customer group screens',()=>{
  it('saves real group fields and permission assignments',()=>{
    const {page,api,router}=setup();page.toggle(1);page.save();
    expect(api.saveGroup).toHaveBeenCalledWith({group_name:'VIP Customers',group_code:'VIP',description:'Premium benefits',type:'VIP',is_active:true,status:'ACT'},undefined);
    expect(api.createPermissionRow).toHaveBeenCalledWith('group-permissions',{groupId:12,funcId:1});
    expect(router.navigate).toHaveBeenCalledWith(['/admin/customer-groups',12]);
  });
  it('retries after assignment failure without creating a duplicate group',()=>{
    const {page,api}=setup();api.createPermissionRow.mockReturnValueOnce(throwError(()=>new Error('Unavailable')));page.toggle(1);page.save();
    expect(page.createdId).toBe(12);expect(page.error()).toBe('Unavailable');page.save();
    expect(api.saveGroup.mock.calls[1][1]).toBe(12);expect(page.assignments.get(1)).toBe(55);
  });
  it('rejects invalid codes and shows unavailable analytics',()=>{
    const {page,api}=setup();page.code='lowercase';page.save();expect(api.saveGroup).not.toHaveBeenCalled();expect(page.stats().every(stat=>stat.value==='—')).toBe(true);
  });
  it('supports searching and preserves selections when filtering',()=>{
    const {page}=setup();page.toggle(1);page.query.set('not found');expect(page.matching()).toEqual([]);expect(page.chosen().has(1)).toBe(true);
  });
});
