import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { PermissionService } from '../../../core/auth/permission.service';
import { AccessGroupsPage } from './access-groups.page';
import { CustomerFormPage } from '../customers/customer-form.page';

describe('Group and user assignments', () => {
  const api = {
    allGroups: vi.fn(() => of([])), allPermissionRows: vi.fn(() => of([])),
    saveGroup: vi.fn(() => of({group_id:12})), createPermissionRow: vi.fn((_resource: string, _params: Record<string, number>) => of({})),
    createCustomer: vi.fn(() => of({id:1})), userEditorOptions: vi.fn(() => of({roles:[],groups:[]})), updateUserEditor: vi.fn(() => of({id:1})),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    api.saveGroup.mockReturnValue(of({group_id:12})); api.createPermissionRow.mockReturnValue(of({}));
    TestBed.configureTestingModule({providers:[provideRouter([]), {provide:AdminApi,useValue:api},
      {provide:PermissionService,useValue:{has:()=>true,allows:()=>true}}]});
    vi.spyOn(TestBed.inject(Router),'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  });
  it('creates a group with real request fields and assigns selected functions', () => {
    const page = TestBed.createComponent(AccessGroupsPage).componentInstance;
    page.name = 'Sales team'; page.display = 'Review orders'; page.chosen = new Set([701,702]); page.save();
    expect(api.saveGroup).toHaveBeenCalledWith({group_name:'Sales team',description:'Review orders',is_active:true,status:'ACT',type:'STAFF'});
    expect(api.createPermissionRow).toHaveBeenCalledWith('group-permissions',{groupId:12,funcId:701});
    expect(api.createPermissionRow).toHaveBeenCalledWith('group-permissions',{groupId:12,funcId:702});
    expect(api.createPermissionRow).not.toHaveBeenCalledWith('user-groups',expect.anything());
  });
  it('retries only unsaved assignments without recreating the group', () => {
    api.createPermissionRow.mockReturnValueOnce(of({})).mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    const page = TestBed.createComponent(AccessGroupsPage).componentInstance;
    page.name='Sales'; page.chosen=new Set([701,702]); page.save();
    expect(page.error()).toBe('Unavailable'); expect(page.createdId).toBe(12);
    page.save();
    expect(api.saveGroup).toHaveBeenCalledTimes(1);
    expect(api.createPermissionRow.mock.calls.map(call => call[1])).toEqual([{groupId:12,funcId:701},{groupId:12,funcId:702},{groupId:12,funcId:702}]);
  });
  it('includes selected customer groups and roles in user creation', () => {
    const page = TestBed.createComponent(CustomerFormPage).componentInstance;
    Object.assign(page,{firstName:'Test',lastName:'User',email:'user@example.test',phone:'+85512345678',username:'test-user',password:'test-password',roleId:2});
    page.groupIds=[12]; page.save();
    expect(api.createCustomer).toHaveBeenCalledWith(expect.objectContaining({group_ids:[12],permission_ids:[],role_ids:[2]}));
    expect(page.password).toBe('');
  });
});
