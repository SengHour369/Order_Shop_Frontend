import { ProductSelect } from '../products/product-select';
import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { concatMap, of, tap } from 'rxjs';
import { PageState } from '../../../shared/utils/page-state';
import { Status } from '../../../shared/components/status';
import { Icon } from '../../../shared/components/icon';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AdminApi, field, Row } from '../api/admin.api';
@Component({imports: [ProductSelect,PageAccessDenied, CanAccessDirective, FormsModule,RouterLink,Status,Icon,TranslatePipe],templateUrl:'./customer-form.html',styleUrls:['../settings/user-edit.css','./customer-form.css']})
export class CustomerFormPage extends PageState {
  private api=inject(AdminApi);
  private router=inject(Router);
  private destroy=inject(DestroyRef);
  user=signal<Row|null>({}); options=signal<Row>({});
  id=0; firstName=''; lastName=''; email=''; phone=''; username=''; birthdate='';
  jobTitle=''; department=''; managerId:number|null=null; approvalReviewerId:number|null=null; gender=''; address=''; language='en-US';
  phoneCountry='';
  changePhoneCountry(value:string){const previous=this.phoneCountry;this.phoneCountry=value;const local=previous && this.phone.startsWith(previous)?this.phone.slice(previous.length).trim():this.phone.replace(/^\+\d{1,3}\s*/,'');this.phone=value+' '+local;}
  password=''; createdId=0;
  active=true; originalStatus=''; twoFactorRequired=false; roleId=0; additionalRoleIds:number[]=[]; groupIds:number[]=[];
  permissionIds:number[]=[];permissionSearch='';permissionsOpen=true;
  permissions(){const q=this.permissionSearch.trim().toLowerCase();return this.rows('permissions').filter(p=>[p['name'],p['code'],p['module']].join(' ').toLowerCase().includes(q));}
  selectedPermissions(){return this.rows('permissions').filter(p=>this.permissionIds.includes(Number(p['id'])));}
  togglePermission(id:number){if(this.busy())return;this.permissionIds=this.permissionIds.includes(id)?this.permissionIds.filter(value=>value!==id):[...this.permissionIds,id];}
  groupSearch=''; groupsOpen=true; photoPreview=''; pendingPhoto:File|null=null;
  field=field; number=Number;
  constructor() {
    super();this.destroy.onDestroy(()=>this.clearPhoto());this.load();
  }
  load(){this.run(this.api.userEditorOptions(),options=>{this.options.set(options);this.roleId=Number(this.rows('roles').find(role=>['CUSTOMER','USER'].includes(String(role['name']).toUpperCase()))?.['id']||0);},true);}
  initials(){return(this.firstName[0]||'')+(this.lastName[0]||'');}
  rows(key:string){return (this.options()[key] as Row[])||[];}
  peopleOptions(key:string){return [{value:0,label:key==='reviewers'?'No assigned reviewer':'No manager'},...this.rows(key).filter(row=>Number(row['id'])!==this.id).map(row=>({value:Number(row['id']),label:String(row['name'])+(row['username']?' (@'+row['username']+')':'')}))];}
  departments(){return (this.options()['departments'] as string[])||[];}
  groups(){return this.rows('groups').filter(g=>String(g['name']).toLowerCase().includes(this.groupSearch.trim().toLowerCase()));}
  selectedGroups(){return this.rows('groups').filter(g=>this.groupIds.includes(Number(g['id'])));}
  toggleGroup(id:number){if(this.busy())return;this.groupIds=this.groupIds.includes(id)?this.groupIds.filter(value=>value!==id):[...this.groupIds,id];}
  chooseRole(){this.additionalRoleIds=[];}
  private clearPhoto(){if(this.photoPreview)URL.revokeObjectURL(this.photoPreview);this.photoPreview='';this.pendingPhoto=null;}
  choosePhoto(event:Event){
    const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file||this.busy())return;
    if(!['image/jpeg','image/png'].includes(file.type)||!file.size||file.size>2*1024*1024){this.error.set('Choose a JPEG or PNG profile photo up to 2 MB.');return;}
    this.clearPhoto();this.pendingPhoto=file;this.photoPreview=URL.createObjectURL(file);this.error.set('');
  }
  save(){
    if(this.busy())return;
    if(!this.firstName.trim()||!this.lastName.trim()||!this.username.trim()||!this.phone.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())||(!this.createdId&&!this.password)){
      this.error.set('Enter the required customer information, a valid email, and a password.');return;
    }
    if(!this.roleId){this.error.set('The default customer role is unavailable. Reload or contact an administrator.');return;}
    if(!this.groupIds.length){this.error.set('Choose at least one customer group.');return;}
    const photo=this.pendingPhoto;
    const create=this.createdId?of({id:this.createdId} as Row):this.api.createCustomer({full_name:`${this.firstName.trim()} ${this.lastName.trim()}`,username:this.username.trim(),email:this.email.trim(),phone:this.phone.trim(),password:this.password,role_ids:[this.roleId],group_ids:this.groupIds,permission_ids:this.permissionIds});
    this.run(create.pipe(tap(row=>{this.createdId=Number(field(row,'id','user_id'));if(!this.createdId)throw new Error('The API did not return the new customer ID.');this.password='';}),concatMap(()=>this.api.updateUserEditor(this.createdId,{
      firstName:this.firstName.trim(),lastName:this.lastName.trim(),email:this.email.trim(),username:this.username.trim(),phone:this.phone.trim(),birthdate:this.birthdate,
      jobTitle:this.jobTitle.trim(),department:this.department,managerId:this.managerId,approvalReviewerId:this.approvalReviewerId,permissionIds:this.permissionIds,gender:this.gender,address:this.address.trim(),language:this.language,
      active:this.active,roleIds:[this.roleId],groupIds:this.groupIds,twoFactorRequired:this.twoFactorRequired,
    })),concatMap(user=>photo?this.api.uploadUserEditorPhoto(this.createdId,photo):of(user))),()=>{
      this.clearPhoto();void this.router.navigate(['/admin/customers',this.createdId]);
    });
  }
}
