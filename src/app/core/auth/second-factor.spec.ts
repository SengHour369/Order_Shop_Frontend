import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { KeycloakService } from './keycloak.service';
describe('Two-factor sign-in',()=>{
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:KeycloakService,useValue:{}}]}));
  afterEach(()=>TestBed.inject(HttpTestingController).verify());
  it('does not accept a session until the second factor succeeds',()=>{
    const auth=TestBed.inject(AuthService),http=TestBed.inject(HttpTestingController);
    auth.login('test-user','test-password').subscribe();
    http.expectOne('/api/v1/public/session/login').flush({token_type:'MFA',refresh_token:'opaque-challenge'});
    expect(auth.session()).toBeNull();expect(auth.secondFactorChallenge()).toBe('opaque-challenge');
    auth.completeSecondFactor('123456').subscribe();
    const request=http.expectOne('/api/v1/public/session/second-factor');
    expect(request.request.body).toEqual({challenge:'opaque-challenge',code:'123456'});
    request.flush({id:7,access_token:'test-access',refresh_token:'test-refresh'});
    expect(auth.session()?.id).toBe(7);expect(auth.secondFactorChallenge()).toBe('');
  });
  it('keeps an invalid code from creating a session',()=>{
    const auth=TestBed.inject(AuthService),http=TestBed.inject(HttpTestingController);
    auth.accept({token_type:'MFA',refresh_token:'opaque-challenge'} as never);
    auth.completeSecondFactor('000000').subscribe({error:()=>{}});
    http.expectOne('/api/v1/public/session/second-factor').flush({message:'Invalid code'},{status:401,statusText:'Unauthorized'});
    expect(auth.session()).toBeNull();
  });
});
