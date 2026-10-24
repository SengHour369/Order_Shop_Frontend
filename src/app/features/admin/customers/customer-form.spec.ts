import { PermissionService } from '../../../core/auth/permission.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { CustomerFormPage } from './customer-form.page';
describe('Add Customer',()=>{
 let api:any;
 beforeEach(()=>{
  api={userEditorOptions:vi.fn(()=>of({roles:[{id:3,name:'USER'}],groups:[{id:2,name:'Customers'}]})),createCustomer:vi.fn(()=>of({id:12})),updateUserEditor:vi.fn(()=>of({id:12})),uploadUserEditorPhoto:vi.fn(()=>of({id:12}))};
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:PermissionService,useValue:{has:()=>true,allows:()=>true}},{provide:AdminApi,useValue:api}]});vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
 });
 function setup(){const p=TestBed.runInInjectionContext(()=>new CustomerFormPage());p.firstName='Jane';p.lastName='Doe';p.email='jane@example.test';p.phone='+85512345678';p.username='jane';p.password='Customer-password-123';p.roleId=3;p.groupIds=[2];return p;}
 it('creates the account and persists extended profile fields',()=>{const p=setup();p.address='Phnom Penh';p.active=false;p.save();expect(api.createCustomer).toHaveBeenCalledWith(expect.objectContaining({full_name:'Jane Doe',role_ids:[3],group_ids:[2]}));expect(api.updateUserEditor).toHaveBeenCalledWith(12,expect.objectContaining({address:'Phnom Penh',active:false}));expect(p.password).toBe('');});
 it('retries the profile without creating another account',()=>{api.updateUserEditor.mockReturnValueOnce(throwError(()=>new Error('Offline')));const p=setup();p.save();expect(p.createdId).toBe(12);expect(p.error()).toBe('Offline');p.save();expect(api.createCustomer).toHaveBeenCalledTimes(1);expect(api.updateUserEditor).toHaveBeenCalledTimes(2);});
 it('requires a password, role, and group before creating',()=>{const p=setup();p.password='';p.save();expect(api.createCustomer).not.toHaveBeenCalled();p.password='Password';p.groupIds=[];p.save();expect(api.createCustomer).not.toHaveBeenCalled();});
 it('uploads the selected photo after the profile is saved',()=>{const p=setup();const photo=new File(['photo'],'profile.png',{type:'image/png'});p.pendingPhoto=photo;p.save();expect(api.uploadUserEditorPhoto).toHaveBeenCalledWith(12,photo);});
 it('persists the chosen reviewer and reporting manager as actual user IDs',()=>{const p=setup();p.managerId=21;p.approvalReviewerId=22;p.save();expect(api.updateUserEditor).toHaveBeenCalledWith(12,expect.objectContaining({managerId:21,approvalReviewerId:22}));});
 it('searches and saves direct permissions alongside groups using the default customer role',()=>{
  const p=setup();p.options.set({permissions:[{id:11,name:'View products',code:'PRODUCT_VIEW',module:'Catalog'},{id:12,name:'Approve imports',code:'IMPORT_APPROVE',module:'Requests'}]});
  p.permissionSearch='product_view';expect(p.permissions()).toHaveLength(1);p.togglePermission(11);expect(p.selectedPermissions()).toHaveLength(1);p.save();
  expect(api.createCustomer).toHaveBeenCalledWith(expect.objectContaining({permission_ids:[11],role_ids:[3]}));expect(api.updateUserEditor).toHaveBeenCalledWith(12,expect.objectContaining({permissionIds:[11],groupIds:[2]}));
 });
 it('renders searchable permission checkboxes instead of role and language controls',async()=>{
  api.userEditorOptions.mockReturnValue(of({roles:[{id:3,name:'USER'}],groups:[{id:2,name:'Customers'}],permissions:[{id:11,name:'View products',code:'PRODUCT_VIEW',module:'Catalog'},{id:12,name:'View orders',code:'ORDER_VIEW',module:'Orders'}]}));
  const f=TestBed.createComponent(CustomerFormPage);f.detectChanges();await f.whenStable();f.detectChanges();
  expect(f.nativeElement.querySelector('select[name="roleId"]')).toBeNull();expect(f.nativeElement.querySelector('select[name="language"]')).toBeNull();
  const search=f.nativeElement.querySelector('[aria-label="Search permissions"]');search.value='product_view';search.dispatchEvent(new Event('input'));f.detectChanges();await f.whenStable();f.detectChanges();
  const card=[...f.nativeElement.querySelectorAll('article')].find((node:any)=>node.querySelector('h3')?.textContent==='User Permissions') as HTMLElement;
  const boxes=card.querySelectorAll('input[type="checkbox"]');expect(boxes).toHaveLength(1);(boxes[0] as HTMLInputElement).click();f.detectChanges();expect(f.componentInstance.permissionIds).toEqual([11]);expect(f.componentInstance.roleId).toBe(3);
 });
});
