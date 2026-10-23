import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { KeycloakService } from './keycloak.service';
const cookie={id:7,username:'Shopper',email:'shopper@example.test',role:'USER',token_type:'Cookie',access_token:'',refresh_token:''};
describe('Browser cookie sessions',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([authInterceptor])),provideHttpClientTesting(),{provide:KeycloakService,useValue:{endSession:vi.fn()}}]}));
 afterEach(()=>{TestBed.inject(HttpTestingController).verify();TestBed.resetTestingModule();});
 it('refreshes an expired access cookie and retries without a bearer token',()=>{
  const auth=TestBed.inject(AuthService),http=TestBed.inject(HttpTestingController);auth.accept(cookie);
  let result:unknown;TestBed.inject(HttpClient).get('/api/v1/user/access').subscribe(value=>result=value);
  const first=http.expectOne('/api/v1/user/access');expect(first.request.withCredentials).toBe(true);expect(first.request.headers.has('Authorization')).toBe(false);
  first.flush({}, {status:401,statusText:'Unauthorized'});
  http.expectOne('/api/v1/public/session/refresh').flush({...cookie});
  const retry=http.expectOne('/api/v1/user/access');expect(retry.request.headers.has('Authorization')).toBe(false);retry.flush({userId:7});
  expect(result).toEqual({userId:7});
 });
 it('restores a profile on reload without exposing either token',()=>{
  const auth=TestBed.inject(AuthService),http=TestBed.inject(HttpTestingController);
  auth.restore().subscribe();http.expectOne('/api/v1/public/session/refresh').flush(cookie);
  expect(auth.session()?.id).toBe(7);expect(auth.session()?.access_token).toBeFalsy();
 });
 it('remains signed out when cookies are missing or expired',()=>{
  const auth=TestBed.inject(AuthService),http=TestBed.inject(HttpTestingController);
  auth.restore().subscribe();http.expectOne('/api/v1/public/session/refresh').flush({}, {status:401,statusText:'Unauthorized'});
  expect(auth.session()).toBeNull();
 });
 it('clears local state and revokes cookies on explicit logout',()=>{
  const auth=TestBed.inject(AuthService),http=TestBed.inject(HttpTestingController);auth.accept(cookie);
  auth.logout().subscribe();expect(auth.session()).toBeNull();
  http.expectOne('/api/v1/public/session/logout').flush(null);
 });
 it('does not restore a response arriving after logout',()=>{
  const auth=TestBed.inject(AuthService),http=TestBed.inject(HttpTestingController);
  auth.restore().subscribe();const req=http.expectOne('/api/v1/public/session/refresh');auth.clear();req.flush(cookie);
  expect(auth.session()).toBeNull();
 });
});
