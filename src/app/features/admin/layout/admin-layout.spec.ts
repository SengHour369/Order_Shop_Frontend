import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PermissionService } from '../../../core/auth/permission.service';
import { AdminLayout } from './admin-layout';
describe('Edit User navigation',()=>{
  afterEach(()=>TestBed.resetTestingModule());
  it('keeps stock navigation accessible on customer screens without bypassing permissions',()=>{
    const events=new Subject<NavigationEnd>();
    const allowed=signal(true);
    TestBed.configureTestingModule({providers:[{provide:Router,useValue:{url:'/admin/customers',events}},{provide:AuthService,useValue:{session:()=>({role:'ADMIN'})}},{provide:PermissionService,useValue:{allowsMenu:(path:string)=>!path.startsWith('/admin/inventory')||allowed()}}]});
    const layout=TestBed.runInInjectionContext(()=>new AdminLayout());
    const paths=()=>layout.groups().flatMap(group=>group.items.map(item=>item.path));
    expect(paths()).toContain('/admin/inventory');
    expect(paths()).toContain('/admin/inventory/stock-in');
    expect(paths()).toContain('/admin/inventory/stock-out');
    allowed.set(false);events.next(new NavigationEnd(1,'/admin/customer-groups','/admin/customer-groups'));
    expect(paths()).not.toContain('/admin/inventory');
  });
  it('uses current group permissions for the menu even when the login role is USER',()=>{
    const events=new Subject<NavigationEnd>();
    TestBed.configureTestingModule({providers:[
      {provide:Router,useValue:{url:'/admin/products',events}},
      {provide:AuthService,useValue:{session:()=>({role:'USER'})}},
      {provide:PermissionService,useValue:{isAdministrator:()=>true,allowsMenu:(path:string)=>path==='/admin/products'}},
    ]});
    const layout=TestBed.runInInjectionContext(()=>new AdminLayout());
    expect(layout.groups().flatMap(group=>group.items.map(item=>item.path))).toEqual(['/admin/products']);
  });
  it('reacts to group grants without using the login role and removes empty sections', () => {
    const grants = signal(new Set(['/admin/products']));
    TestBed.configureTestingModule({providers: [
      {provide: Router, useValue: {url: '/admin/products', events: new Subject<NavigationEnd>()}},
      {provide: AuthService, useValue: {session: () => ({role: 'USER'})}},
      {provide: PermissionService, useValue: {allowsMenu: (path: string) => grants().has(path)}},
    ]});
    const layout = TestBed.runInInjectionContext(() => new AdminLayout());
    expect(layout.groups().map(group => group.label)).toEqual(['Products']);
    expect(layout.groups()[0].items.map(item => item.path)).toEqual(['/admin/products']);
    grants.set(new Set(['/admin/returns']));
    expect(layout.groups().map(group => group.label)).toEqual(['Orders']);
    expect(layout.groups()[0].items.map(item => item.path)).toEqual(['/admin/returns']);
    grants.set(new Set());
    expect(layout.groups()).toEqual([]);
  });
  it('renders only permitted sidebar links and headings', () => {
    const visible = signal(new Set(['/admin/products']));
    TestBed.configureTestingModule({providers: [provideRouter([]),
      {provide: AuthService, useValue: {session: () => ({role: 'USER', username: 'Viewer'})}},
      {provide: PermissionService, useValue: {
        allowsMenu: (path: string) => visible().has(path),
        allows: (path: string) => visible().has(path),
      }},
    ]});
    const fixture = TestBed.createComponent(AdminLayout); fixture.detectChanges();
    const menu = () => fixture.nativeElement.querySelector('.adm-nav') as HTMLElement;
    expect(menu().querySelector('a[href="/admin/products"]')).not.toBeNull();
    expect(menu().querySelector('a[href="/admin/returns"]')).toBeNull();
    expect(menu().textContent).not.toContain('Payments');
    visible.set(new Set(['/admin/returns'])); fixture.detectChanges();
    expect(menu().querySelector('a[href="/admin/products"]')).toBeNull();
    expect(menu().querySelector('a[href="/admin/returns"]')).not.toBeNull();
    expect(menu().textContent).not.toContain('Products');
    visible.set(new Set()); fixture.detectChanges();
    expect(menu().querySelector('a')).toBeNull();
    expect(menu().querySelector('.adm-group')).toBeNull();
  });
  it('keeps the same permitted navigation across editor, detail and other admin routes',()=>{
    const events=new Subject<NavigationEnd>();
    const router={url:'/admin/users/edit/1',events};
    TestBed.configureTestingModule({providers:[{provide:Router,useValue:router},{provide:AuthService,useValue:{session:()=>({role:'ADMIN'})}},{provide:PermissionService,useValue:{allowsMenu:()=>true}}]});
    const layout=TestBed.runInInjectionContext(()=>new AdminLayout());
    expect(layout.groups().some(group=>group.label==='Automation'&&group.items.some(item=>item.path==='/admin/ai-automation'))).toBe(true);
    const expected = layout.groups().flatMap(group => group.items.map(item => item.path));
    expect(layout.groups().some(group => group.label === 'Approvals')).toBe(true);
    layout.collapsed.set(true);
    for (const url of ['/admin/users/1', '/admin/users', '/admin/orders', '/admin/products']) {
      router.url=url; events.next(new NavigationEnd(1,url,url));
      expect(layout.groups().flatMap(group => group.items.map(item => item.path))).toEqual(expected);
      expect(layout.collapsed()).toBe(true);
    }
  });
});
