import {Component,DestroyRef,inject,input,signal,OnInit,OnChanges,SimpleChanges} from '@angular/core';
import {DatePipe,JsonPipe,KeyValuePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Observable,Subscription} from 'rxjs';
import {PermissionService} from '../../../core/auth/permission.service';
import {AuthService} from '../../../core/auth/auth.service';
import {Icon} from '../../../shared/components/icon';
import {TranslatePipe} from '../../../core/i18n/translate.pipe';
import {AiImportsApi,ImportBatch,ImportPreview,ImportRow,ImportSheet,ImportTool,ImportAction,ImportMode,ExecutionHistory,ImportImage,stringValues} from './ai-imports.api';
@Component({selector:'app-ai-import',imports:[DatePipe,JsonPipe,KeyValuePipe,FormsModule,Icon,TranslatePipe],templateUrl:'./ai-import.html',styleUrl:'./ai-import.scss'})
export class AiImportComponent implements OnInit,OnChanges{
 mode=input<ImportMode>('upload');initialBatchId=input('');
 api=inject(AiImportsApi);access=inject(PermissionService);auth=inject(AuthService);private lifetime=inject(DestroyRef);
 tools=signal<ImportTool[]>([]);batches=signal<ImportBatch[]>([]);preview=signal<ImportPreview|null>(null);
 busy=signal(false);loading=signal(false);listLoading=signal(false);error=signal('');message=signal('');fresh=signal(false);selectedId=signal('');historyLoading=signal(false);
 executionHistory=signal<ExecutionHistory|null>(null);auditHistory=signal<unknown>(null);listPage=0;listPages=0;batchCount=0;page=0;filter='';reviewerId:number|null=null;reason='';
 imageUrls=signal<Record<string,string>>({});
 private releaseImages(){Object.values(this.imageUrls()).forEach(url=>URL.revokeObjectURL(url));this.imageUrls.set({});}
 sheetTools:Record<string,string>={};columns:Record<string,Record<string,string>>={};rowValues:Record<string,Record<string,string>>={};
 private readRequest?:Subscription;private readTicket=0;private listTicket=0;private historyTicket=0;
 readonly filters=['','VALID','INVALID','DUPLICATE','EDITED','CREATED','FAILED','SKIPPED','UNVALIDATED'];readonly Object=Object;readonly object=stringValues;
 has(code:string){return this.access.has(code);}
 locked(){return this.busy()||this.loading();}
 ngOnInit(){
  this.lifetime.onDestroy(()=>this.releaseImages());
  this.api.tools().pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:t=>this.tools.set(t),error:()=>this.error.set('Import registry unavailable. Refresh before confirming mappings.')});
  this.refreshList();if(this.initialBatchId())this.load(this.initialBatchId());
 }
 ngOnChanges(changes:SimpleChanges){if(changes['initialBatchId']&&!changes['initialBatchId'].firstChange&&this.initialBatchId())this.load(this.initialBatchId());}
 private failure(e:any){return e.status===409?'This import changed or the workbook is already staged. Reload its current version before continuing.':e.error?.message||e.error?.detail||'Import action failed. Check permissions and reload the current batch before retrying.';}
 private run<T>(operation:Observable<T>,accept:(value:T)=>void){
  if(this.locked())return;this.busy.set(true);this.error.set('');this.message.set('');
  operation.pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:v=>{this.busy.set(false);accept(v);},error:e=>{this.busy.set(false);this.fresh.set(false);this.error.set(this.failure(e));},complete:()=>this.busy.set(false)});
 }
 refreshList(target=this.listPage){
  if(this.busy()||this.listLoading())return;const ticket=++this.listTicket;this.listLoading.set(true);
  this.api.list(this.mode(),target,this.mode()==='executions'&&this.has('IMPORT_REVIEW')).pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:r=>{if(ticket!==this.listTicket)return;this.listPage=target;this.listPages=r.totalPages;this.batchCount=r.totalElements;this.batches.set(r.content);this.listLoading.set(false);},error:e=>{if(ticket===this.listTicket){this.listLoading.set(false);this.error.set(this.failure(e));}}});
 }
 paginateList(delta:number){const target=this.listPage+delta;if(target>=0&&target<this.listPages)this.refreshList(target);}
 upload(event:Event){
  const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file||this.locked()||!this.has('IMPORT_UPLOAD'))return;
  if(!/\.xlsx?$/i.test(file.name)||file.size===0){this.error.set('Choose a non-empty XLSX or XLS workbook.');return;}
  this.run(this.api.upload(file),batch=>{this.load(batch.id);this.refreshList(0);});
 }
 load(id:string,targetPage=0,targetFilter=''){
  if(this.busy())return;
  if(!/^[a-f0-9-]{36}$/i.test(id)){this.error.set('Invalid import identifier.');return;}
  if(this.selectedId()!==id){this.releaseImages();this.preview.set(null);this.executionHistory.set(null);this.auditHistory.set(null);this.reason='';this.reviewerId=null;this.historyTicket++;this.historyLoading.set(false);}
  this.selectedId.set(id);this.fresh.set(false);this.loading.set(true);this.error.set('');const ticket=++this.readTicket;this.readRequest?.unsubscribe();
  this.readRequest=this.api.preview(id,targetPage,targetFilter).pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:p=>{
   if(ticket!==this.readTicket)return;
   if(!p?.summary||!p?.rows?.content||!Array.isArray(p.sheets)||!Array.isArray(p.mappings)||!Array.isArray(p.errors)){
     this.preview.set(null);this.loading.set(false);this.error.set('The running AI service uses an older import API. Deploy the verified ai-service build and reload this batch.');return;
   }
   this.preview.set(p);this.page=targetPage;this.filter=targetFilter;this.sheetTools={};this.columns={};this.rowValues={};
   for(const sheet of p.sheets){this.sheetTools[sheet.id]=sheet.tool??'';const m=p.mappings.find(v=>v.sheetId===sheet.id);this.columns[sheet.id]=this.object(sheet.confirmed?m?.confirmedValues:m?.suggestions);}
   for(const row of p.rows.content)this.rowValues[row.id]=this.object(row.valuesJson);
   this.fresh.set(true);this.loading.set(false);
  },error:e=>{if(ticket===this.readTicket){this.loading.set(false);this.error.set(this.failure(e));}}});
 }
 reload(){if(this.selectedId())this.load(this.selectedId(),this.page,this.filter);}
 headers(sheet:ImportSheet):string[]{try{const h=JSON.parse(sheet.headers);return Array.isArray(h)?h.filter(x=>typeof x==='string'):[]}catch{return []}}
 fields(sheet:ImportSheet){return Object.keys(this.tools().find(t=>t.name===this.sheetTools[sheet.id])?.schema??{}).filter(field=>!['imageIds','imageChecksums'].includes(field));}
 values(row:ImportRow){const tool=this.preview()?.sheets.find(s=>s.id===row.sheetId)?.tool;return [...new Set([...Object.keys(this.tools().find(t=>t.name===tool)?.schema??{}),...Object.keys(this.rowValues[row.id]??{})])].filter(field=>!['imageIds','imageChecksums'].includes(field));}
 productRow(row:ImportRow){return this.preview()?.sheets.find(s=>s.id===row.sheetId)?.tool==='PRODUCT_BULK_CREATE';}
 rowImages(row:ImportRow){const ids=(this.rowValues[row.id]?.['imageIds']??'').split(',');return this.preview()?.images?.filter(image=>image.rowId===row.id&&ids.includes(image.id))??[];}
 attachImage(row:ImportRow,event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';const p=this.preview();if(!p||!file||this.locked()||!this.editable()||!this.domainAllowed(row.sheetId))return;if(file.size>5242880||!['image/png','image/jpeg'].includes(file.type)){this.error.set('Choose a PNG/JPEG image up to 5 MiB.');return;}this.run(this.api.attachImage(p.batch,row.id,file),b=>this.load(b.id,this.page,this.filter));}
 detachImage(row:ImportRow,image:ImportImage){const p=this.preview();if(p&&!this.locked()&&this.editable()&&this.domainAllowed(row.sheetId))this.run(this.api.detachImage(p.batch,row.id,image.id),b=>this.load(b.id,this.page,this.filter));}
 viewImage(image:ImportImage){if(!this.fresh()||this.locked()||this.imageUrls()[image.id])return;this.run(this.api.image(this.selectedId(),image.id),blob=>{if(blob.type!=='image/png'){this.error.set('Image response is not a PNG.');return;}this.imageUrls.update(urls=>({...urls,[image.id]:URL.createObjectURL(blob)}));});}
 sheetName(id:string){return this.preview()?.sheets.find(s=>s.id===id)?.name??id;}
 suggestions(sheet:ImportSheet){return this.object(this.preview()?.mappings.find(m=>m.sheetId===sheet.id)?.suggestions);}
 messages(row:ImportRow){return this.preview()?.errors.filter(e=>e.rowId===row.id)??[];}
 editable(){return this.fresh()&&!!this.preview()&&!['PROCESSING','COMPLETED','PARTIAL_SUCCESS','FAILED','REJECTED'].includes(this.preview()!.batch.status);}
 domainAllowed(sheetId:string){const tool=this.preview()?.sheets.find(s=>s.id===sheetId)?.tool;const definition=this.tools().find(t=>t.name===tool);return !!definition&&definition.enabled&&this.has(definition.permission);}
 canSubmit(){const b=this.preview()?.batch;return this.editable()&&this.has('IMPORT_UPLOAD')&&b?.ownerId===this.auth.session()?.id;}
 canReview(){const b=this.preview()?.batch;return this.fresh()&&b?.status==='SUBMITTED'&&b.assignedReviewerId===this.auth.session()?.id&&this.has('IMPORT_REVIEW');}
 canApprove(){const b=this.preview()?.batch;return this.canReview()&&this.has('IMPORT_APPROVE')&&this.has('IMPORT_EXECUTE')&&b?.ownerId!==this.auth.session()?.id&&b?.lastEditorId!==this.auth.session()?.id;}
 canExecute(){const b=this.preview()?.batch;return this.fresh()&&!!b&&['APPROVED','PROCESSING','PARTIAL_SUCCESS','FAILED'].includes(b.status)&&b.reviewerId===this.auth.session()?.id&&['IMPORT_EXECUTE','IMPORT_APPROVE','IMPORT_REVIEW'].every(p=>this.has(p));}
 action(action:ImportAction){
  const p=this.preview();if(!p||!this.fresh()||this.locked())return;
  if(['analyze','validate'].includes(action)&&!this.editable())return;
  if(action==='submit'&&(!this.canSubmit()||!Number.isSafeInteger(this.reviewerId)||!this.reviewerId||this.reviewerId===p.batch.ownerId||this.reviewerId===p.batch.lastEditorId)){this.error.set('Choose an independent authorized reviewer.');return;}
  if(action==='approve'&&!this.canApprove()||['reject','request-changes'].includes(action)&&!this.canReview()||action==='execute'&&!this.canExecute())return;
  if(['approve','reject','request-changes'].includes(action)&&(!this.reason.trim()||this.reason.length>2000))return;
  const extra=action==='submit'?{reviewerId:this.reviewerId}:['approve','reject','request-changes'].includes(action)?{reason:this.reason.trim()}:{};
  this.run(this.api.action(p.batch,action,extra),b=>{this.message.set(action==='execute'?'Execution response received. Only rows with confirmed resource IDs are marked created.':'Batch updated. Review its current status before continuing.');this.load(b.id,this.page,this.filter);this.refreshList();});
 }
 confirm(sheet:ImportSheet){
  const p=this.preview();const t=this.tools().find(t=>t.name===this.sheetTools[sheet.id]);if(!p||!this.editable()||!t?.enabled||!this.has(t.permission))return;
  const columns=Object.fromEntries(Object.entries(this.columns[sheet.id]??{}).filter(([,v])=>!!v));const fields=Object.values(columns);
  if(!fields.length||new Set(fields).size!==fields.length||Object.entries(t.schema).some(([field,schema])=>schema.required&&!fields.includes(field))){this.error.set('Map every required field once. Resolve ambiguous mappings before confirmation.');return;}
  this.run(this.api.mapping(p.batch,sheet.id,t.name,columns),b=>this.load(b.id,this.page,this.filter));
 }
 save(row:ImportRow){const p=this.preview();if(p&&this.editable()&&this.domainAllowed(row.sheetId))this.run(this.api.edit(p.batch,row.id,this.rowValues[row.id]),b=>this.load(b.id,this.page,this.filter));}
 skip(row:ImportRow){const p=this.preview();if(p&&this.editable())this.run(this.api.skip(p.batch,row),b=>this.load(b.id,this.page,this.filter));}
 paginate(delta:number){const target=this.page+delta;const p=this.preview();if(p&&!this.locked()&&target>=0&&target<p.rows.totalPages)this.load(p.batch.id,target,this.filter);}
 changeFilter(filter:string){if(this.preview()&&!this.locked())this.load(this.preview()!.batch.id,0,filter);}
 history(){
  const id=this.selectedId();if(!id||!this.fresh()||this.historyLoading())return;const ticket=++this.historyTicket;this.historyLoading.set(true);
  this.api.executions(id).pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:value=>{if(ticket===this.historyTicket){this.executionHistory.set(value);this.historyLoading.set(false);}},error:e=>{if(ticket===this.historyTicket){this.historyLoading.set(false);this.error.set(this.failure(e));}}});
  this.api.history(id).pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:value=>{if(ticket===this.historyTicket)this.auditHistory.set(value);},error:e=>{if(ticket===this.historyTicket)this.error.set(this.failure(e));}});
 }
 download(kind:'report'|'original'){
  if(!this.selectedId()||!this.fresh())return;
  this.run(this.api.download(this.selectedId(),kind),blob=>{const url=URL.createObjectURL(blob);try{const link=document.createElement('a');link.href=url;link.download=kind==='report'?'import-report.csv':'original-workbook.bin';link.click();}finally{URL.revokeObjectURL(url);}});
 }
}
