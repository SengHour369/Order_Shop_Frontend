import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AutomationApi, AutomationService, Execution, MonitorRow } from './automation.api';
@Component({
  imports:[TranslatePipe, FormsModule,DatePipe,JsonPipe],
  styleUrl:'./automation.css',
  template:`<header><div><h1>Order & payment automation</h1><p>Verified payments, stock workflows and notification delivery.</p></div><button (click)="load()" [disabled]="busy()">{{ "Refresh" | translate }}</button></header>
  <div class="notice">Payment success requires provider verification. AI reviews cannot approve payments or change financial status.</div>
  <section class="filters"><label>Service<select [disabled]="busy()" [(ngModel)]="service" (ngModelChange)="reset()"><option value="orders">Order Service</option><option value="payments">Payment Service</option></select></label>
  <label>{{ "Order ID" | translate }}<input [disabled]="busy()" type="number" min="1" [(ngModel)]="orderId" /></label><label>State<select [disabled]="busy()" [(ngModel)]="state"><option value="">{{ "All" | translate }}</option><option>{{ "PENDING" | translate }}</option><option>DONE</option><option>DEAD</option></select></label><button (click)="reset()" [disabled]="busy()">Apply filters</button><button class="outline" (click)="review()" [disabled]="busy() || !orderId">Review order</button></section>
  <nav>@for(t of tabs;track t){<button [disabled]="busy()" [class.selected]="tab===t" (click)="tab=t; load()">{{t}}</button>}</nav>
  @if(error()){<p role="alert" class="error">{{error()}}</p>}
  @if(busy()){<p role="status">Loading authoritative service data…</p>}
  @if(tab==='Executions'){
  <div class="table-wrap"><table><thead><tr><th>Order / event</th><th>Direction</th><th>{{ "Status" | translate }}</th><th>Attempts</th><th>Created</th><th>{{ "Actions" | translate }}</th></tr></thead><tbody>
  @for(e of events();track e.event_id+e.direction){<tr><td><strong>#{{e.order_id}} · {{e.event_type}}</strong><small>{{e.event_id}}</small><small>Request: {{e.request_id}} · Trace: {{e.trace_id || '—'}}</small></td><td>{{e.direction}}</td><td><span [class.failed]="e.state==='DEAD'">{{e.state}}</span><small>{{e.last_error}}</small></td><td>{{e.attempts}}</td><td>{{e.created_at | date:'short'}}</td><td><button class="outline" (click)="showLogs(e)" [disabled]="busy()">Logs</button>@if(e.state==='DEAD'){<button (click)="retry(e)" [disabled]="busy()">Retry event</button>}</td></tr>}
  @empty{<tr><td colspan="6">No executions match these filters.</td></tr>}
  </tbody></table></div><footer><button (click)="page=page-1;load()" [disabled]="busy() || page===0">{{ "Previous" | translate }}</button><span>Page {{page+1}}</span><button (click)="page=page+1;load()" [disabled]="busy() || events().length<50">{{ "Next" | translate }}</button></footer>
  }@else{
  <div class="cards">@for(row of rows();track $index){<article><pre>{{row | json}}</pre></article>}@empty{<p>No records available.</p>}</div>
  }
  @if(detail()!==null){<section class="detail"><button class="outline" (click)="detail.set(null)">Close details</button><h2>{{detailTitle()}}</h2><pre>{{detail() | json}}</pre></section>}
  `,
})
export class AutomationPage {
  private readonly api=inject(AutomationApi);
  readonly tabs=['Executions','Review alerts','Notification delivery'];
  service:AutomationService='orders'; tab='Executions'; state=''; orderId?:number; page=0;
  readonly busy=signal(false); readonly error=signal(''); readonly events=signal<Execution[]>([]); readonly rows=signal<MonitorRow[]>([]); readonly detail=signal<unknown>(null); readonly detailTitle=signal('');
  constructor(){ void this.load(); }
  reset(){this.page=0;this.detail.set(null);void this.load();}
  async run(action:()=>Promise<void>){if(this.busy())return;this.busy.set(true);this.error.set('');try{await action();}catch{this.error.set('Unable to load automation data. Check service availability, your admin permissions and whether automation migrations are enabled.');}finally{this.busy.set(false);}}
  load(){this.events.set([]);this.rows.set([]);return this.run(async()=>{if(this.tab==='Executions')this.events.set(await firstValueFrom(this.api.events(this.service,this.page,this.state,this.orderId)));else this.rows.set(await firstValueFrom(this.tab==='Review alerts'?this.api.reviews(this.service):this.api.deliveries(this.orderId)));});}
  showLogs(e:Execution){return this.run(async()=>{this.detailTitle.set('Execution attempts');this.detail.set(await firstValueFrom(this.api.logs(this.service,e.event_id)));});}
  async retry(e:Execution){await this.run(async()=>{await firstValueFrom(this.api.retry(this.service,e));});if(!this.error())await this.load();}
  review(){if(!this.orderId || !Number.isSafeInteger(this.orderId) || this.orderId<1)return;return this.run(async()=>{this.detailTitle.set('Authoritative order review');this.detail.set(await firstValueFrom(this.api.review(this.orderId!)));});}
}
