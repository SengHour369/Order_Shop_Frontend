import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { UserEditPage } from './user-edit.page';

function setup(status = 'ACT') {
  const saved = { id: 7, fullName: 'John Doe', email: 'saved@example.test', username: 'john', phone: '+85512345678', roleIds:[1],groupIds:[2],status };
  const api = { userEditor: vi.fn(() => of(saved)), userEditorOptions:vi.fn(()=>of({roles:[{id:1,name:'ADMIN'}],groups:[{id:2,name:'Sales'}]})), uploadUserEditorPhoto:vi.fn(()=>of(saved)), updateUserEditor: vi.fn((_id: number, body: object) => of({ ...saved, ...body })), requestUserPasswordReset: vi.fn(() => of({})) };
  TestBed.configureTestingModule({ providers: [{ provide: AdminApi, useValue: api }, { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '7' })) } }] });
  return { page: TestBed.runInInjectionContext(() => new UserEditPage()), api };
}
describe('Edit User', () => {
  it('submits profile fields without a password or unsupported settings', () => {
    const { page, api } = setup(); page.firstName = ' Jane '; page.lastName = ' Smith '; page.active = false; page.save();
    expect(api.updateUserEditor).toHaveBeenCalledWith(7, expect.objectContaining({firstName:'Jane',lastName:'Smith',email:'saved@example.test',phone:'+85512345678',active:false,roleIds:[1],groupIds:[2],twoFactorRequired:false}));
    expect(page.message()).toBe('User changes saved.');
  });
  it('preserves a pending account status unless explicitly changed', () => {
    const { page, api } = setup('NEW'); page.save();
    expect(api.updateUserEditor.mock.calls[0][1]).toMatchObject({active:false});
  });
  it('requests a password reset for the saved email instead of an unsaved edit', () => {
    const { page, api } = setup(); page.email = 'unsaved@example.test'; page.resetPassword();
    expect(api.requestUserPasswordReset).toHaveBeenCalledWith('saved@example.test');
  });
  it('rejects invalid email before saving', () => {
    const { page, api } = setup(); page.email = 'invalid'; page.save();
    expect(api.updateUserEditor).not.toHaveBeenCalled(); expect(page.error()).toContain('valid email');
  });
  it('excludes self, displays names with usernames, and saves both assignments',()=>{
    const {page,api}=setup();page.options.set({managers:[{id:7,name:'John',username:'john'},{id:9,name:'Jane',username:'jane'}],reviewers:[{id:10,name:'Jane',username:'approver'}]});
    expect(page.peopleOptions('managers')).toEqual([{value:0,label:'No manager'},{value:9,label:'Jane (@jane)'}]);
    page.managerId=9;page.approvalReviewerId=10;page.save();expect(api.updateUserEditor).toHaveBeenCalledWith(7,expect.objectContaining({managerId:9,approvalReviewerId:10}));
  });
 it('saves cleared direct permissions while preserving existing roles and language',()=>{const {page,api}=setup();page.permissionIds=[];page.save();expect(api.updateUserEditor).toHaveBeenCalledWith(7,expect.objectContaining({permissionIds:[],roleIds:[1],language:'en-US'}));});
});
