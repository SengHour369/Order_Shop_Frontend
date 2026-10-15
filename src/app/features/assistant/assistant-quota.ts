import { Injectable, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { AuthService } from '../../core/auth/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
export interface AiQuota {dailyLimit:number;used:number;remaining:number;unlimited:boolean;resetAt:string;}
@Injectable({providedIn:'root'})
export class AssistantQuota {
 private api=inject(ApiClient);private auth=inject(AuthService);private destroy=inject(DestroyRef);private ticket=0;private resetTimer?:ReturnType<typeof setTimeout>;
 readonly value=signal<AiQuota|null>(null);readonly error=signal('');
 readonly exhausted=computed(()=>!!this.value()&&!this.value()!.unlimited&&this.value()!.remaining===0);
 readonly label=computed(()=>{const q=this.value();return q?q.unlimited?'Unlimited AI Requests':`AI Requests Today: ${q.used} / ${q.dailyLimit}`:'Checking AI request quota…';});
 constructor(){effect(()=>{const user=this.auth.session()?.id;this.ticket++;this.value.set(null);this.error.set('');clearTimeout(this.resetTimer);if(user)this.refresh();});this.destroy.onDestroy(()=>clearTimeout(this.resetTimer));}
 refresh(){if(!this.auth.session())return;const ticket=++this.ticket;this.api.get<AiQuota>('/api/ai/quota').pipe(takeUntilDestroyed(this.destroy)).subscribe({next:q=>{if(ticket!==this.ticket)return;this.apply(q);this.error.set('');},error:()=>{if(ticket===this.ticket)this.error.set('Daily quota is unavailable. The server will still check every request.');}});}
 apply(q:AiQuota){if(!Number.isInteger(q.used)||!Number.isInteger(q.dailyLimit)||!Number.isInteger(q.remaining)||!Number.isFinite(Date.parse(q.resetAt)))return;this.value.set(q);clearTimeout(this.resetTimer);const delay=Date.parse(q.resetAt)-Date.now();if(delay>0)this.resetTimer=setTimeout(()=>this.refresh(),Math.min(delay+100,2147483647));}
 handle(error:{error?:Partial<AiQuota>&{code?:string}}){if(error.error?.code==='AI_DAILY_LIMIT_EXCEEDED'){this.apply({...error.error,unlimited:false} as AiQuota);return true;}return false;}
}
