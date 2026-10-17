import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { CustomerFormPage } from './customer-form.page';
describe('Add Customer',()=>{
 let api:any;
 beforeEach(()=>{
  api={userEditorOptions:vi.fn(()=>of({roles:[{id:3,name:'USER'}],groups:[{id:2,name:'Customers'}]})),createCustomer:vi.fn(()=>of({id:12})),updateUserEditor:vi.fn(()=>of({id:12})),uploadUserEditorPhoto:vi.fn(()=>of({id:12}))};
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AdminApi,useValue:api}]});vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
 });
 function setup(){const p=TestBed.runInInjectionContext(()=>new CustomerFormPage());p.firstName='Jane';p.lastName='Doe';p.email='jane@example.test';p.phone='+85512345678';p.username='jane';p.password='Customer-password-123';p.roleId=3;p.groupIds=[2];return p;}
 it('creates the account and persists extended profile fields',()=>{const p=setup();p.address='Phnom Penh';p.active=false;p.save();expect(api.createCustomer).toHaveBeenCalledWith(expect.objectContaining({full_name:'Jane Doe',role_ids:[3],group_ids:[2]}));expect(api.updateUserEditor).toHaveBeenCalledWith(12,expect.objectContaining({address:'Phnom Penh',active:false}));expect(p.password).toBe('');});
 it('retries the profile without creating another account',()=>{api.updateUserEditor.mockReturnValueOnce(throwError(()=>new Error('Offline')));const p=setup();p.save();expect(p.createdId).toBe(12);expect(p.error()).toBe('Offline');p.save();expect(api.createCustomer).toHaveBeenCalledTimes(1);expect(api.updateUserEditor).toHaveBeenCalledTimes(2);});
 it('requires a password, role, and group before creating',()=>{const p=setup();p.password='';p.save();expect(api.createCustomer).not.toHaveBeenCalled();p.password='Password';p.groupIds=[];p.save();expect(api.createCustomer).not.toHaveBeenCalled();});
 it('uploads the selected photo after the profile is saved',()=>{const p=setup();const photo=new File(['photo'],'profile.png',{type:'image/png'});p.pendingPhoto=photo;p.save();expect(api.uploadUserEditorPhoto).toHaveBeenCalledWith(12,photo);});
});
