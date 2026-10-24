import { ProductSelect } from '../products/product-select';
import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { concatMap, forkJoin, of } from 'rxjs';
import { PageState } from '../../../shared/utils/page-state';
import { Status } from '../../../shared/components/status';
import { Icon } from '../../../shared/components/icon';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AdminApi, field, Row } from '../api/admin.api';
@Component({imports: [ProductSelect,PageAccessDenied, CanAccessDirective, FormsModule,RouterLink,Status,Icon,TranslatePipe],templateUrl:'./user-edit.html',styleUrl:'./user-edit.css'})
export class UserEditPage extends PageState {
  private api=inject(AdminApi);
  private route=inject(ActivatedRoute);
  private destroy=inject(DestroyRef);
  user=signal<Row|null>(null); options=signal<Row>({});
  id=0; firstName=''; lastName=''; email=''; phone=''; username=''; birthdate='';
  jobTitle=''; department=''; managerId:number|null=null; approvalReviewerId:number|null=null; gender=''; address=''; language='en-US';
  phoneCountry='';
  changePhoneCountry(value:string){const previous=this.phoneCountry;this.phoneCountry=value;const local=previous && this.phone.startsWith(previous)?this.phone.slice(previous.length).trim():this.phone.replace(/^\+\d{1,3}\s*/,'');this.phone=value+' '+local;}
  active=false; originalStatus=''; twoFactorRequired=false; roleId=0; additionalRoleIds:number[]=[]; groupIds:number[]=[];
  permissionIds:number[]=[];permissionSearch='';permissionsOpen=true;
  permissions(){const q=this.permissionSearch.trim().toLowerCase();return this.rows('permissions').filter(p=>[p['name'],p['code'],p['module']].join(' ').toLowerCase().includes(q));}
  selectedPermissions(){return this.rows('permissions').filter(p=>this.permissionIds.includes(Number(p['id'])));}
  togglePermission(id:number){if(this.busy())return;this.permissionIds=this.permissionIds.includes(id)?this.permissionIds.filter(value=>value!==id):[...this.permissionIds,id];}
  groupSearch=''; groupsOpen=true; photoPreview=''; pendingPhoto:File|null=null;
  field=field; number=Number;
  constructor() {
    super(); this.destroy.onDestroy(()=>this.clearPhoto());
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params=>this.load(Number(params.get('id'))));
  }
  load(id:number) {
    this.id=id;this.user.set(null);this.clearPhoto();
    this.run(forkJoin({user:this.api.userEditor(id),options:this.api.userEditorOptions()}), result=>{
      this.options.set(result.options);this.apply(result.user);
    },true);
  }
  private apply(user:Row) {
    this.user.set(user);
    const name=String(field(user,'fullName','full_name','name')).trim().split(/\s+/);
    this.firstName=name.shift()||'';this.lastName=name.join(' ');
    this.email=String(field(user,'email'));this.phone=String(field(user,'phone','phoneNumber'));
    this.phoneCountry=['+855','+1','+44','+66','+84','+65'].find(prefix=>this.phone.startsWith(prefix))||'';
    this.username=String(field(user,'username'));this.birthdate=String(field(user,'birthdate')).slice(0,10);
    this.originalStatus=String(field(user,'status'));this.active=this.originalStatus==='ACT';
    this.jobTitle=String(field(user,'jobTitle'));this.department=String(field(user,'department'));
    this.managerId=user['managerId']?Number(user['managerId']):null;
    this.approvalReviewerId=user['approvalReviewerId']?Number(user['approvalReviewerId']):null;
    this.gender=String(field(user,'gender'));this.address=String(field(user,'address'));
    this.language=String(field(user,'language'))||'en-US';this.twoFactorRequired=user['twoFactorRequired']===true;
    const roles=(user['roleIds'] as number[])||[];this.roleId=roles[0]||0;this.additionalRoleIds=roles.slice(1);
    this.groupIds=[...((user['groupIds'] as number[])||[])];
    this.permissionIds=[...((user['permissionIds'] as number[])||[])];
  }
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
    if(this.busy()||!this.user())return;
    if(!this.firstName.trim()||!this.lastName.trim()||!this.username.trim()||!this.phone.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())){this.error.set('Enter your first and last name, username, phone and a valid email address.');return;}
    if(!this.roleId||!this.groupIds.length){this.error.set('Choose at least one user group; the existing account role must remain valid.');return;}
    const photo=this.pendingPhoto;
    this.run(this.api.updateUserEditor(this.id,{
      firstName:this.firstName.trim(),lastName:this.lastName.trim(),email:this.email.trim(),username:this.username.trim(),phone:this.phone.trim(),birthdate:this.birthdate,
      jobTitle:this.jobTitle.trim(),department:this.department,managerId:this.managerId,approvalReviewerId:this.approvalReviewerId,permissionIds:this.permissionIds,gender:this.gender,address:this.address.trim(),language:this.language,
      active:this.active,roleIds:[this.roleId,...this.additionalRoleIds],groupIds:this.groupIds,twoFactorRequired:this.twoFactorRequired,
    }).pipe(concatMap(user=>{this.apply(user);return photo?this.api.uploadUserEditorPhoto(this.id,photo):of(user);})),user=>{
      this.apply(user);this.clearPhoto();this.message.set('User changes saved.');
    });
  }
  resetPassword(){
    if(!this.user()||this.busy())return;
    this.run(this.api.requestUserPasswordReset(String(field(this.user()!,'email'))),()=>this.message.set('Password reset requested. If the account is eligible, a reset link will be emailed.'));
  }
}
