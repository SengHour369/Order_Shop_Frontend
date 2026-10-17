import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PermissionService } from '../../../core/auth/permission.service';
import { AdminLayout } from './admin-layout';
describe('Edit User navigation',()=>{
  it('restores the full sidebar when leaving the editor',()=>{
    const events=new Subject<NavigationEnd>();
    const router={url:'/admin/users/edit/1',events};
    TestBed.configureTestingModule({providers:[{provide:Router,useValue:router},{provide:AuthService,useValue:{session:()=>({role:'ADMIN'})}},{provide:PermissionService,useValue:{allows:()=>true}}]});
    const layout=TestBed.runInInjectionContext(()=>new AdminLayout());
    expect(layout.groups().some(group=>group.label==='Excel Imports')).toBe(false);
    router.url='/admin/users';events.next(new NavigationEnd(1,router.url,router.url));
    expect(layout.groups().some(group=>group.label==='Excel Imports')).toBe(true);
  });
});
