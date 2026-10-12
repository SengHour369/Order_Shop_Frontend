import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { PermissionService, requiredPermissions } from './permission.service';
describe('Effective permissions', () => {
  let http: HttpTestingController, auth: AuthService, access: PermissionService;
  const session = {id:7, username:'reviewer', email:'reviewer@example.test', role:'ADMIN', access_token:'one', refresh_token:'refresh'};
  beforeEach(() => {
    TestBed.configureTestingModule({providers:[provideHttpClient(), provideHttpClientTesting()]});
    http = TestBed.inject(HttpTestingController); auth = TestBed.inject(AuthService); access = TestBed.inject(PermissionService);
    auth.accept(session);
  });
  afterEach(() => http.verify());
  it('uses effective permission codes rather than the ADMIN label', () => {
    expect(access.allows('/admin/products')).toBe(false);
    access.load().subscribe();
    http.expectOne('/api/v1/user/access').flush({userId:7,administrator:true,permissions:['PRODUCT_VIEW']});
    expect(access.allows('/admin/products')).toBe(true);
    expect(access.allows('/admin/products/add')).toBe(false);
    expect(access.allows('/admin/products/edit/1')).toBe(false);
  });
  it('drops access immediately when the session changes', () => {
    access.load().subscribe();
    http.expectOne('/api/v1/user/access').flush({userId:7,administrator:true,permissions:['USER_MANAGE']});
    auth.clear(); expect(access.has('USER_MANAGE')).toBe(false);
    auth.accept({...session,id:8,access_token:'two'});
    expect(access.has('USER_MANAGE')).toBe(false);
  });
  it('ignores a late response belonging to another account', () => {
    access.load().subscribe(); const old = http.expectOne('/api/v1/user/access');
    auth.accept({...session,id:8,access_token:'two'});
    old.flush({userId:7,administrator:true,permissions:['USER_MANAGE']});
    expect(access.has('USER_MANAGE')).toBe(false);
  });
  it('fails closed and permits retry after a server error', () => {
    access.load().subscribe(result => expect(result).toBe(false));
    http.expectOne('/api/v1/user/access').flush({}, {status:503,statusText:'Unavailable'});
    expect(access.has('USER_MANAGE')).toBe(false);
    access.load().subscribe(result => expect(result).toBe(true));
    http.expectOne('/api/v1/user/access').flush({userId:7,administrator:true,permissions:[]});
  });
  it('does not let an older refresh overwrite revoked permissions', () => {
    access.load(true).subscribe(); const old = http.expectOne('/api/v1/user/access');
    access.load(true).subscribe(); const latest = http.expectOne('/api/v1/user/access');
    latest.flush({userId:7,administrator:true,permissions:[]});
    old.flush({userId:7,administrator:true,permissions:['USER_MANAGE']});
    expect(access.has('USER_MANAGE')).toBe(false);
  });
  it('requires creation and assignment permissions for new groups', () => {
    expect(requiredPermissions('/admin/customer-groups/add')).toEqual(['USER_GROUP_CREATE','GRP_PERM_CREATE','FUNC_VIEW']);
    expect(requiredPermissions('/admin/groups/add')).toEqual(requiredPermissions('/admin/customer-groups/add'));
  });
});
