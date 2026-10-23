import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiClient } from '../../../core/api/api-client';
import { PermissionService } from '../../../core/auth/permission.service';
import { PageState } from '../../../shared/utils/page-state';
import { Status } from '../../../shared/components/status';
interface Step {key:string;title:string;status:string;httpStatus:number|null;durationMs:number;detail:string;requestId:string|null;}
interface Summary {id:string;status:string;startedAt:string;finishedAt:string|null;}
interface Report extends Summary {steps:Step[];}
@Component({imports:[DatePipe,FormsModule,RouterLink,Status],styleUrl:'./live-tests.css',template:`
<section class="live-tests">
 <header><div><span class="eyebrow">SYSTEM VERIFICATION</span><h2>Live Tests</h2><p>Step-by-step checks against the real running services. No mocked responses.</p></div>
 <button class="adm-btn adm-primary" [disabled]="busy() || report()?.status==='RUNNING' || !permissions.has('SYSTEM_TEST_RUN')" (click)="start()">{{report()?.status==='RUNNING'?'Tests running…':'Run real HTTP checks'}}</button></header>
 <app-status [busy]="busy()" [error]="error()" />
 <div class="notice"><strong>What this run does</strong><p>Reads health, access rules, catalog, orders, inventory, payment availability, notifications, AI service information and workflow availability. It does not place orders, move stock, charge/refund money, activate workflows or send messages.</p><label><input type="checkbox" [(ngModel)]="guestSession" [disabled]="report()?.status==='RUNNING'" /> Also create and revoke an isolated guest cookie session</label><p class="small">Missing configuration or unsupported workflows appear as Blocked. An available payment method does not prove a bank transfer succeeded.</p></div>
 <div class="layout"><aside><h3>My recent runs</h3><button class="adm-btn" [disabled]="busy()" (click)="history()">Refresh history</button>
 @for(run of runs();track run.id){<button class="run" [class.selected]="report()?.id===run.id" (click)="load(run.id)"><span class="badge" [attr.data-state]="run.status">{{run.status}}</span><time>{{run.startedAt|date:'medium'}}</time><small>{{run.id}}</small></button>} @empty{<p>No real test runs yet.</p>}
 </aside><main>
 @if(report();as current){
 <div class="report-head"><div><h3>Run results</h3><p class="id">{{current.id}}</p><p>Started {{current.startedAt|date:'medium'}} @if(current.finishedAt){ · Finished {{current.finishedAt|date:'medium'}}}</p></div><span class="badge" [attr.data-state]="current.status">{{current.status}}</span></div>
 <div class="counts"><span><strong>{{count('PASSED')}}</strong> Passed</span><span><strong>{{count('FAILED')}}</strong> Failed</span><span><strong>{{count('BLOCKED')}}</strong> Blocked</span><span><strong>{{count('PENDING')+count('RUNNING')}}</strong> Remaining</span></div>
 <div class="actions"><button class="adm-btn" [disabled]="busy()" (click)="load(current.id)">Refresh results</button><button class="adm-btn" (click)="download()">Download JSON report</button></div>
 <ol class="steps">@for(step of current.steps;track step.key;let i=$index){<li><span class="number">{{i+1}}</span><div><div class="step-title"><h4>{{step.title}}</h4><span class="badge" [attr.data-state]="step.status">{{step.status}}</span></div><p>{{step.detail}}</p><small>@if(step.httpStatus){HTTP {{step.httpStatus}} · }{{step.durationMs}} ms @if(step.requestId){ · Request {{step.requestId}}}</small></div></li>}</ol>
 }@else{<div class="empty"><h3>Test the real environment</h3><p>Start a run to see each request, its result, duration and correlation ID. Results are saved on the server.</p><a routerLink="/admin/settings">Open store configuration →</a></div>}
 </main></div>
</section>`})
export class LiveTestsPage extends PageState {
 private api=inject(ApiClient);protected permissions=inject(PermissionService);
 private destroy=inject(DestroyRef);runs=signal<Summary[]>([]);report=signal<Report|null>(null);guestSession=false;
 constructor(){super();this.history();const timer=setInterval(()=>{const report=this.report();if(report?.status==='RUNNING'&&!this.busy())this.load(report.id);},2000);this.destroy.onDestroy(()=>clearInterval(timer));}
 history(){this.run(this.api.get<Summary[]>('/api/v1/admin/live-tests/runs'),rows=>{this.runs.set(rows);if(!this.report()&&rows.length)this.load(rows[0].id);});}
 start(){if(!this.permissions.has('SYSTEM_TEST_RUN')||this.report()?.status==='RUNNING')return;this.run(this.api.post<Report>('/api/v1/admin/live-tests/runs',{guestSession:this.guestSession}),report=>{this.report.set(report);this.runs.update(rows=>[report,...rows.filter(r=>r.id!==report.id)].slice(0,20));});}
 load(id:string){this.run(this.api.get<Report>('/api/v1/admin/live-tests/runs/'+encodeURIComponent(id)),report=>{this.report.set(report);this.runs.update(rows=>rows.map(r=>r.id===report.id?report:r));});}
 count(status:string){return this.report()?.steps.filter(s=>s.status===status).length||0;}
 download(){const report=this.report();if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='live-test-'+report.id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
