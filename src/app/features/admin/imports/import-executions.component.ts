import { Component, DestroyRef, OnChanges, OnInit, SimpleChanges, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, catchError, forkJoin, from, map, mergeMap, of, switchMap, toArray } from 'rxjs';
import { PermissionService } from '../../../core/auth/permission.service';
import { PageState } from '../../../shared/utils/page-state';
import { Icon } from '../../../shared/components/icon';
import { AiImportComponent } from './ai-import.component';
import { ImportValuesComponent, ImportActivityComponent } from './import-readable-details';
import { AiImportsApi, ExecutionHistory, ImportBatch, ImportPreview, stringValues } from './ai-imports.api';

export interface ExecutionRecord { batch: ImportBatch; preview: ImportPreview|null; history: ExecutionHistory|null; }
export const importTypeLabels: Record<string,string> = {
  PRODUCT_BULK_CREATE:'Products', PRODUCT_SKU_BULK_CREATE:'Product SKUs', CATEGORY_BULK_CREATE:'Categories',
  BRANCH_BULK_CREATE:'Branches', INVENTORY_STOCK_IN_BULK:'Stock in', INVENTORY_STOCK_ADJUST_BULK:'Stock adjustments', PROMOTION_BULK_CREATE:'Promotions',
};
export function executionTypes(record: ExecutionRecord) {
  return [...new Set(record.preview?.sheets.map(sheet => importTypeLabels[sheet.tool??'']??sheet.tool??'Unmapped')??[])];
}
export function executionStarted(record: ExecutionRecord) {
  return record.history?.executions.map(attempt=>attempt.startedAt).filter((value):value is string=>!!value).sort()[0]??'';
}
export function executionCompleted(record: ExecutionRecord) {
  if (!['COMPLETED','PARTIAL_SUCCESS','FAILED'].includes(record.batch.status)) return '';
  return record.history?.executions.map(attempt=>attempt.completedAt).filter((value):value is string=>!!value).sort().at(-1)??'';
}
export function executionReport(records: ExecutionRecord[]) {
  const lines = [['Batch ID','Import types','Owner ID','Started at','Completed at','Status','Confirmed created rows','Total rows'],
    ...records.map(record=>[record.batch.id, executionTypes(record).join(', '), record.batch.ownerId, executionStarted(record), executionCompleted(record), record.batch.status, record.preview?.summary.statuses['CREATED']??'',record.preview?.summary.totalRows??''])];
  return '\uFEFF'+lines.map(line=>line.map(value=>{let text=String(value);if(/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
}
@Component({selector:'app-import-executions',imports:[DatePipe,FormsModule,Icon,AiImportComponent,ImportValuesComponent,ImportActivityComponent],templateUrl:'./import-executions.html',styleUrl:'./import-executions.css'})
export class ImportExecutionsComponent extends PageState implements OnInit,OnChanges {
  initialBatchId=input('');
  private api=inject(AiImportsApi);
  private access=inject(PermissionService);
  private lifetime=inject(DestroyRef);
  records=signal<ExecutionRecord[]>([]);
  page=signal(0);pages=signal(1);batchCount=signal(0);
  search=signal('');status=signal('');type=signal('');owner=signal('');from=signal('');to=signal('');showDates=signal(false);
  selected=signal<Set<string>>(new Set());
  selectedId=signal('');detail=signal<ImportPreview|null>(null);detailHistory=signal<ExecutionHistory|null>(null);
  detailLoading=signal(false);detailError=signal('');tab=signal('summary');showWorkflow=signal(false);rowPage=signal(0);
  logs=signal<unknown>(null);logsLoading=signal(false);logsError=signal('');downloadBusy=signal(false);
  private detailRequest?:Subscription;private rowRequest?:Subscription;private logRequest?:Subscription;private detailTicket=0;
  types=executionTypes;started=executionStarted;completed=executionCompleted;values=stringValues;
  statuses=['APPROVED','PROCESSING','COMPLETED','PARTIAL_SUCCESS','FAILED'];
  typeOptions=computed(()=>[...new Set(this.records().flatMap(record=>executionTypes(record)))].sort());
  ownerOptions=computed(()=>[...new Set(this.records().map(record=>String(record.batch.ownerId)))].sort());
  filtered=computed(()=>{
    const search=this.search().trim().toLowerCase();
    const from=this.from()?new Date(this.from()+'T00:00:00').getTime():null;
    const to=this.to()?new Date(this.to()+'T23:59:59.999').getTime():null;
    return this.records().filter(record=>{
      const start=executionStarted(record),date=start?new Date(start).getTime():NaN;
      return (!search||[record.batch.id,record.batch.ownerId,record.batch.status,this.statusLabel(record.batch.status),...executionTypes(record)].join(' ').toLowerCase().includes(search))&&
        (!this.status()||record.batch.status===this.status())&&(!this.type()||executionTypes(record).includes(this.type()))&&
        (!this.owner()||String(record.batch.ownerId)===this.owner())&&(from===null||date>=from)&&(to===null||date<=to);
    });
  });
  stats=computed(()=>{
    const records=this.filtered();
    return [
      {label:'Total imports',value:records.length,icon:'list',color:'blue'},
      {label:'Successful',value:records.filter(r=>r.batch.status==='COMPLETED').length,icon:'check',color:'green'},
      {label:'Completed with issues',value:records.filter(r=>r.batch.status==='PARTIAL_SUCCESS').length,icon:'help',color:'amber'},
      {label:'Failed',value:records.filter(r=>r.batch.status==='FAILED').length,icon:'close',color:'red'},
    ];
  });
  failedAttempts=computed(()=>this.detailHistory()?.rows.filter(row=>row.status==='FAILED'||!!row.errorCode)??[]);
  ngOnInit(){this.refresh();}
  ngOnChanges(changes:SimpleChanges){if(changes['initialBatchId']&&!changes['initialBatchId'].firstChange&&this.initialBatchId())this.open(this.initialBatchId());}
  refresh(target=this.page()) {
    const wanted=target===this.page()?(this.selectedId()||this.initialBatchId()):'';
    this.detailTicket++;this.detailRequest?.unsubscribe();this.rowRequest?.unsubscribe();this.logRequest?.unsubscribe();
    this.records.set([]);this.selected.set(new Set());this.detail.set(null);this.detailHistory.set(null);this.detailError.set('');this.detailLoading.set(false);this.logsLoading.set(false);this.showWorkflow.set(false);
    const source=this.api.list('executions',target,this.access.has('IMPORT_REVIEW')).pipe(
      switchMap(result=>from(result.content).pipe(
        mergeMap(batch=>forkJoin({
          preview:this.api.preview(batch.id,0,'',1).pipe(catchError(()=>of(null))),
          history:this.api.executions(batch.id).pipe(catchError(()=>of(null))),
        }).pipe(map(data=>({batch,...data}))),4),
        toArray(),
        map(records=>({result,records:records.sort((a,b)=>result.content.findIndex(r=>r.id===a.batch.id)-result.content.findIndex(r=>r.id===b.batch.id))})),
      )),
    );
    this.run(source,({result,records})=>{
      this.page.set(target);this.pages.set(Math.max(1,result.totalPages));this.batchCount.set(result.totalElements);
      this.records.set(records.filter(record=>!!record.history?.executions.length||this.statuses.includes(record.batch.status)));
      const id=wanted||this.filtered()[0]?.batch.id;if(id)this.open(id);else this.selectedId.set('');
    },true);
  }
  goto(page:number){if(!this.busy()&&page>=0&&page<this.pages())this.refresh(page);}
  open(id:string) {
    if(!/^[a-f0-9-]{36}$/i.test(id)){this.detailError.set('Invalid import identifier.');return;}
    const ticket=++this.detailTicket;this.detailRequest?.unsubscribe();this.rowRequest?.unsubscribe();this.logRequest?.unsubscribe();
    this.selectedId.set(id);this.detail.set(null);this.detailHistory.set(null);this.detailLoading.set(true);this.detailError.set('');this.tab.set('summary');this.logs.set(null);this.logsError.set('');this.logsLoading.set(false);this.showWorkflow.set(false);this.rowPage.set(0);
    this.detailRequest=forkJoin({preview:this.api.preview(id),history:this.api.executions(id)}).pipe(takeUntilDestroyed(this.lifetime)).subscribe({
      next:result=>{if(ticket!==this.detailTicket)return;this.detail.set(result.preview);this.detailHistory.set(result.history);this.detailLoading.set(false);},
      error:()=>{if(ticket===this.detailTicket){this.detailLoading.set(false);this.detailError.set('Could not load execution details. Retry this import.');}},
    });
  }
  setTab(tab:string){this.tab.set(tab);if(tab==='data')this.loadRows(0);if(tab==='logs'&&!this.logs())this.loadLogs();}
  loadRows(page:number){
    if(!this.selectedId()||this.detailLoading()||page<0)return;const ticket=this.detailTicket;this.rowRequest?.unsubscribe();this.detailLoading.set(true);this.detailError.set('');
    this.rowRequest=this.api.preview(this.selectedId(),page,'CREATED').pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:preview=>{if(ticket===this.detailTicket){this.detail.set(preview);this.rowPage.set(page);this.detailLoading.set(false);}},error:()=>{if(ticket===this.detailTicket){this.detailLoading.set(false);this.detailError.set('Could not load imported rows. Please retry.');}}});
  }
  loadLogs(){
    if(!this.selectedId()||this.logsLoading())return;const ticket=this.detailTicket;this.logsLoading.set(true);this.logsError.set('');
    this.logRequest=this.api.history(this.selectedId()).pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:logs=>{if(ticket===this.detailTicket){this.logs.set(logs);this.logsLoading.set(false);}},error:()=>{if(ticket===this.detailTicket){this.logsLoading.set(false);this.logsError.set('Could not load audit history.');}}});
  }
  statusLabel(status:string){return ({COMPLETED:'Completed',PARTIAL_SUCCESS:'Completed with issues',FAILED:'Failed',PROCESSING:'Processing',APPROVED:'Awaiting execution'} as Record<string,string>)[status]??status;}
  statusTone(status:string){return status==='COMPLETED'?'success':status==='FAILED'?'failed':status==='PARTIAL_SUCCESS'?'warning':'neutral';}
  batchName(id:string){return 'Workbook '+id.slice(0,8);}
  selectedRecord(){const preview=this.detail(),history=this.detailHistory();return preview?{batch:preview.batch,preview,history}:null;}
  count(status:string){return this.detail()?.summary.statuses[status]??0;}
  importedRows(){return this.detail()?.rows.content.filter(row=>row.status==='CREATED'&&!!row.resourceId)??[];}
  allSelected(){return this.filtered().length>0&&this.filtered().every(record=>this.selected().has(record.batch.id));}
  toggle(id:string){this.selected.update(ids=>{const next=new Set(ids);if(next.has(id))next.delete(id);else next.add(id);return next;});}
  toggleAll(){const select=!this.allSelected();this.selected.update(ids=>{const next=new Set(ids);for(const record of this.filtered()){if(select)next.add(record.batch.id);else next.delete(record.batch.id);}return next;});}
  exportable=computed(()=>this.filtered().filter(record=>!this.selected().size||this.selected().has(record.batch.id)));
  exportReport(){const records=this.exportable();if(records.length)this.saveBlob(new Blob([executionReport(records)],{type:'text/csv;charset=utf-8;'}),'import-executions.csv');}
  private saveBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);try{const link=document.createElement('a');link.href=url;link.download=name;link.click();}finally{URL.revokeObjectURL(url);}}
  downloadReport(){if(!this.selectedId()||this.downloadBusy())return;this.downloadBusy.set(true);this.api.download(this.selectedId(),'report').pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:blob=>{this.saveBlob(blob,'import-report.csv');this.downloadBusy.set(false);},error:()=>{this.downloadBusy.set(false);this.detailError.set('Could not download the import report.');}});}
}
