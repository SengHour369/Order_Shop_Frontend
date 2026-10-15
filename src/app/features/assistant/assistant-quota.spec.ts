import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../../core/auth/auth.service';
import { AssistantQuota } from './assistant-quota';
describe('Authoritative AI quota display',()=>{
 let http:HttpTestingController;let quota:AssistantQuota;const session=signal<{id:number}|null>({id:1});
 beforeEach(()=>{session.set({id:1});TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:AuthService,useValue:{session}}]});http=TestBed.inject(HttpTestingController);quota=TestBed.inject(AssistantQuota);TestBed.tick();});
 afterEach(()=>http.verify());
 it('loads persisted usage and handles a server daily limit',()=>{http.expectOne('/api/ai/quota').flush({dailyLimit:5,used:3,remaining:2,unlimited:false,resetAt:'2099-01-01T00:00:00+07:00'});expect(quota.label()).toBe('AI Requests Today: 3 / 5');quota.handle({error:{code:'AI_DAILY_LIMIT_EXCEEDED',dailyLimit:5,used:5,remaining:0,resetAt:'2099-01-01T00:00:00+07:00'}});expect(quota.exhausted()).toBe(true);});
 it('uses backend administrator exemption',()=>{http.expectOne('/api/ai/quota').flush({dailyLimit:5,used:0,remaining:5,unlimited:true,resetAt:'2099-01-01T00:00:00+07:00'});expect(quota.label()).toBe('Unlimited AI Requests');expect(quota.exhausted()).toBe(false);});
});
