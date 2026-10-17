import {Component,DestroyRef,inject,input,signal,OnInit,OnChanges,SimpleChanges} from '@angular/core';
import {DatePipe,KeyValuePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Observable,Subscription,from,concatMap,tap,last,of,catchError,map} from 'rxjs';
import {PermissionService} from '../../../core/auth/permission.service';
import {AuthService} from '../../../core/auth/auth.service';
import {Icon} from '../../../shared/components/icon';
import {TranslatePipe} from '../../../core/i18n/translate.pipe';
import {ImportValuesComponent,ImportActivityComponent} from './import-readable-details';
import {AiImportsApi,ImportBatch,ImportPreview,ImportRow,ImportSheet,ImportTool,ImportAction,ImportMode,ExecutionHistory,ImportImage,stringValues} from './ai-imports.api';
@Component({selector:'app-ai-import',imports:[DatePipe,KeyValuePipe,FormsModule,Icon,TranslatePipe,ImportValuesComponent,ImportActivityComponent],templateUrl:'./ai-import.html',styleUrl:'./ai-import.scss'})
export class AiImportComponent implements OnInit,OnChanges{
 mode=input<ImportMode>('upload');initialBatchId=input('');
 api=inject(AiImportsApi);access=inject(PermissionService);auth=inject(AuthService);private lifetime=inject(DestroyRef);
 tools=signal<ImportTool[]>([]);batches=signal<ImportBatch[]>([]);preview=signal<ImportPreview|null>(null);
 busy=signal(false);loading=signal(false);listLoading=signal(false);error=signal('');message=signal('');fresh=signal(false);selectedId=signal('');historyLoading=signal(false);
 executionHistory=signal<ExecutionHistory|null>(null);auditHistory=signal<unknown>(null);listPage=0;listPages=0;batchCount=0;page=0;filter='';reviewerId:number|null=null;reason='';
 imageUrls=signal<Record<string,string>>({});
 activeSheet=signal('');search=signal('');showFields=signal(false);showBatches=signal(false);
 selectedRows=signal<Set<string>>(new Set());
 draftRows=signal<ImportRow[]>([]);private knownRows:Record<string,ImportRow>={};
 uploadedFiles:Record<string,{name:string;size:number}>={};private baselines:Record<string,Record<string,string>>={};
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
  this.api.list(this.mode(),target,this.mode()==='executions'&&this.has('IMPORT_REVIEW')).pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:r=>{if(ticket!==this.listTicket)return;this.listPage=target;this.listPages=r.totalPages;this.batchCount=r.totalElements;this.batches.set(r.content);this.listLoading.set(false);if(this.mode()==='review'&&!this.selectedId()&&!this.initialBatchId()&&r.content.length)this.load(r.content[0].id);},error:e=>{if(ticket===this.listTicket){this.listLoading.set(false);this.error.set(this.failure(e));}}});
 }
 paginateList(delta:number){const target=this.listPage+delta;if(target>=0&&target<this.listPages)this.refreshList(target);}
 upload(event:Event){
  const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file||this.locked()||!this.has('IMPORT_UPLOAD'))return;
  if(!/\.xlsx?$/i.test(file.name)||file.size===0){this.error.set('Choose a non-empty XLSX or XLS workbook.');return;}
  if(this.hasDrafts()){this.error.set('Save or discard your corrections before replacing the workbook.');return;}
  this.run(this.api.upload(file).pipe(tap(batch=>this.uploadedFiles[batch.id]={name:file.name,size:file.size}),concatMap(batch=>this.api.action(batch,'analyze').pipe(catchError(()=>{this.message.set('Workbook uploaded. Review the extracted columns and choose the worksheet type.');return of(batch);})))),batch=>{this.load(batch.id);this.refreshList(0);});
 }
 load(id:string,targetPage=0,targetFilter=''){
  if(this.busy())return;
  if(!/^[a-f0-9-]{36}$/i.test(id)){this.error.set('Invalid import identifier.');return;}
  if(this.selectedId()!==id){if(this.hasDrafts()){this.error.set('Save or discard your corrections before opening another workbook.');return;}this.releaseImages();this.preview.set(null);this.executionHistory.set(null);this.auditHistory.set(null);this.reason='';this.reviewerId=null;this.historyTicket++;this.historyLoading.set(false);this.activeSheet.set('');this.search.set('');this.rowValues={};this.baselines={};this.knownRows={};this.draftRows.set([]);}
  this.selectedId.set(id);this.fresh.set(false);this.loading.set(true);this.error.set('');const ticket=++this.readTicket;this.readRequest?.unsubscribe();
  this.readRequest=this.api.preview(id,targetPage,targetFilter).pipe(takeUntilDestroyed(this.lifetime)).subscribe({next:p=>{
   if(ticket!==this.readTicket)return;
   if(!p?.summary||!p?.rows?.content||!Array.isArray(p.sheets)||!Array.isArray(p.mappings)||!Array.isArray(p.errors)){
     this.preview.set(null);this.loading.set(false);this.error.set('The running AI service uses an older import API. Deploy the verified ai-service build and reload this batch.');return;
   }
   this.preview.set(p);this.selectedRows.set(new Set());this.page=targetPage;this.filter=targetFilter;this.sheetTools={};this.columns={};
   for(const sheet of p.sheets){this.sheetTools[sheet.id]=sheet.tool??'';const m=p.mappings.find(v=>v.sheetId===sheet.id);this.columns[sheet.id]=this.object(sheet.confirmed?m?.confirmedValues:m?.suggestions);}
   for(const row of p.rows.content){this.knownRows[row.id]=row;this.draftRows.update(drafts=>drafts.filter(draft=>draft.id!==row.id));const dirty=this.rowDirty(row.id);const sheet=p.sheets.find(sheet=>sheet.id===row.sheetId);const values=this.object(sheet?.confirmed?row.valuesJson:row.originalValues);this.baselines[row.id]={...values};if(!dirty)this.rowValues[row.id]={...values};else for(const field of ['imageIds','imageChecksums']){if(field in values)this.rowValues[row.id][field]=values[field];else delete this.rowValues[row.id][field];}}
   if(!p.sheets.some(sheet=>sheet.id===this.activeSheet()))this.activeSheet.set(p.rows.content[0]?.sheetId??p.sheets[0]?.id??'');
   this.fresh.set(true);this.loading.set(false);
  },error:e=>{if(ticket===this.readTicket){this.loading.set(false);this.error.set(this.failure(e));}}});
 }
 reload(){if(this.selectedId())this.load(this.selectedId(),this.page,this.filter);}
 headers(sheet:ImportSheet):string[]{try{const h=JSON.parse(sheet.headers);return Array.isArray(h)?h.filter(x=>typeof x==='string'):[]}catch{return []}}
 fields(sheet:ImportSheet){return Object.keys(this.tools().find(t=>t.name===this.sheetTools[sheet.id])?.schema??{}).filter(field=>!['imageIds','imageChecksums'].includes(field));}
 values(row:ImportRow){const sheet=this.preview()?.sheets.find(s=>s.id===row.sheetId);if(sheet&&!sheet.confirmed)return this.headers(sheet);return Object.keys(this.tools().find(t=>t.name===sheet?.tool)?.schema??{}).filter(field=>!['imageIds','imageChecksums'].includes(field));}
 domainTools(){return this.tools().filter(tool=>Object.keys(tool.schema).length>0);}
 currentSheet(){return this.preview()?.sheets.find(sheet=>sheet.id===this.activeSheet());}
 needsMapping(){return this.preview()?.sheets.some(sheet=>!sheet.confirmed)??false;}
 tableFields(){const sheet=this.currentSheet();if(sheet&&!sheet.confirmed)return this.headers(sheet);return Object.keys(this.tools().find(tool=>tool.name===sheet?.tool)?.schema??{}).filter(field=>!['imageIds','imageChecksums'].includes(field));}
 fieldSchema(field:string){const sheet=this.currentSheet();if(sheet&&!sheet.confirmed)return undefined;return this.tools().find(tool=>tool.name===sheet?.tool)?.schema[field];}
 fieldLabel(field:string){const labels:Record<string,string>={name:'Name',subCategoryId:'Subcategory ID',isActive:'Active',productId:'Product ID',inventoryId:'Inventory ID',branchId:'Branch ID',skuId:'SKU ID',startAt:'Starts at',endAt:'Ends at'};return labels[field]??field.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,v=>v.toUpperCase());}
 inputType(field:string){const type=this.fieldSchema(field)?.type;return ['id','zero','money','percent'].includes(type??'')?'number':type==='date'?'datetime-local':'text';}
 inputMin(field:string){const type=this.fieldSchema(field)?.type;return type==='id'?1:type==='zero'?0:['money','percent'].includes(type??'')?0.0001:null;}
 inputMax(field:string){const type=this.fieldSchema(field)?.type;return type==='percent'?100:['id','zero'].includes(type??'')?1000000000:null;}
 inputStep(field:string){return ['money','percent'].includes(this.fieldSchema(field)?.type??'')?'0.0001':'1';}
 fieldLimit(field:string){return field==='name'?120:field==='barcode'?64:field==='address'?500:2000;}
 setCell(row:ImportRow,field:string,value:unknown){if(this.values(row).includes(field))this.rowValues[row.id][field]=value==null?'':String(value);}
 rowDirty(id:string){return JSON.stringify(this.rowValues[id]??{})!==JSON.stringify(this.baselines[id]??{});}
 hasDrafts(){return this.draftRows().length>0||Object.keys(this.rowValues).some(id=>this.rowDirty(id));}
 discardDrafts(){for(const row of this.draftRows()){delete this.rowValues[row.id];delete this.baselines[row.id];}this.draftRows.set([]);for(const [id,values] of Object.entries(this.baselines))this.rowValues[id]={...values};this.error.set('');this.message.set('Unsaved corrections discarded.');}
 visibleRows(){const query=this.search().trim().toLowerCase();return [...(this.preview()?.rows.content??[]),...this.draftRows()].filter(row=>row.sheetId===this.activeSheet()&&(!query||[...Object.values(this.rowValues[row.id]??{}),row.status,String(row.rowNumber),...this.messages(row).map(e=>e.message)].join(' ').toLowerCase().includes(query)));}
 rowConfirmed(row:ImportRow){return !!this.preview()?.sheets.find(sheet=>sheet.id===row.sheetId)?.confirmed;}
 rowEditable(row:ImportRow){if(!this.editable())return false;if(this.rowConfirmed(row))return this.domainAllowed(row.sheetId);return this.has('IMPORT_UPLOAD')&&this.preview()?.batch.ownerId===this.auth.session()?.id||this.domainAllowed(row.sheetId);}
 newRow(row:ImportRow){return this.draftRows().some(draft=>draft.id===row.id);}
 addRow(){const sheet=this.currentSheet();if(this.locked()||!this.editable()||!sheet?.confirmed||!this.domainAllowed(sheet.id))return;const id=crypto.randomUUID();const number=Math.max(1,...Object.values(this.knownRows).map(row=>row.rowNumber),...this.draftRows().map(row=>row.rowNumber))+1;const row:ImportRow={id,sheetId:sheet.id,rowNumber:number,originalValues:'{}',valuesJson:'{}',status:'NEW',edited:true,skipped:false,resourceId:null,affectedResourceId:null};this.rowValues[id]=Object.fromEntries(this.tableFields().map(field=>[field,'']));this.baselines[id]={};this.draftRows.update(rows=>[...rows,row]);this.search.set('');}
 removeDraft(row:ImportRow){if(this.locked()||!this.newRow(row))return;this.draftRows.update(rows=>rows.filter(draft=>draft.id!==row.id));delete this.rowValues[row.id];delete this.baselines[row.id];}
 sheetPageCount(id:string){return this.preview()?.rows.content.filter(row=>row.sheetId===id).length??0;}
 statusCount(...statuses:string[]){return statuses.reduce((total,status)=>total+(this.preview()?.summary.statuses[status]??0),0);}
 statusLabel(row:ImportRow){return row.skipped?'Skipped':({VALID:'Valid',INVALID:'Need review',DUPLICATE:'Duplicate',UNVALIDATED:'Not validated',CREATED:'Created',FAILED:'Failed',EDITED:'Edited'} as Record<string,string>)[row.status]??row.status;}
 batchLabel(){const batch=this.preview()?.batch;return batch?this.uploadedFiles[batch.id]?.name??'Workbook '+batch.id.slice(0,8):'';}
 batchStatusLabel(){const status=this.preview()?.batch.status??'';return ({SUBMITTED:'Pending approval',APPROVED:'Approved',CHANGES_REQUESTED:'Changes requested',DRAFT:'Draft',VALIDATED:'Validated',COMPLETED:'Completed'} as Record<string,string>)[status]??status;}
 importTypes(){const labels:Record<string,string>={CATEGORY_BULK_UPDATE:'Category updates',BRANCH_BULK_UPDATE:'Branch updates',PRODUCT_BULK_UPDATE:'Product updates',PRODUCT_BULK_CREATE:'Products',PRODUCT_SKU_BULK_CREATE:'Product SKUs',CATEGORY_BULK_CREATE:'Categories',BRANCH_BULK_CREATE:'Branches',INVENTORY_STOCK_IN_BULK:'Stock in',INVENTORY_STOCK_ADJUST_BULK:'Stock adjustments',PROMOTION_BULK_CREATE:'Promotions'};return [...new Set(this.preview()?.sheets.map(sheet=>labels[sheet.tool??'']??sheet.tool??'Unmapped')??[])].join(', ');}
 reviewSelection(){return this.visibleRows().filter(row=>!row.skipped&&this.selectedRows().has(row.id));}
 allRowsSelected(){const rows=this.visibleRows().filter(row=>!row.skipped);return rows.length>0&&rows.every(row=>this.selectedRows().has(row.id));}
 toggleRow(row:ImportRow){if(this.locked()||!this.editable()||row.skipped)return;this.selectedRows.update(ids=>{const next=new Set(ids);if(next.has(row.id))next.delete(row.id);else next.add(row.id);return next;});}
 toggleVisibleRows(){if(this.locked()||!this.editable())return;const select=!this.allRowsSelected();this.selectedRows.update(ids=>{const next=new Set(ids);for(const row of this.visibleRows().filter(row=>!row.skipped)){if(select)next.add(row.id);else next.delete(row.id);}return next;});}
 skipSelected(){
  const p=this.preview(),rows=this.reviewSelection();if(!p||!this.editable()||this.locked()||this.hasDrafts()||!rows.length)return;
  let current=p.batch;
  this.run(from(rows).pipe(concatMap(row=>this.api.skip(current,row).pipe(tap(batch=>current=batch))),last()),batch=>{this.selectedRows.set(new Set());this.message.set('Selected rows skipped. Validate and resubmit the updated version for review.');this.load(batch.id,this.page,this.filter);this.refreshList();});
 }
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
  if(this.hasDrafts()){this.error.set('Save or discard your corrections before continuing.');return;}
  if(['analyze','validate'].includes(action)&&!this.editable())return;
  if(action==='submit'&&(!this.canSubmit()||!Number.isSafeInteger(this.reviewerId)||!this.reviewerId||this.reviewerId===p.batch.ownerId||this.reviewerId===p.batch.lastEditorId)){this.error.set('Choose an independent authorized reviewer.');return;}
  if(action==='approve'&&!this.canApprove()||['reject','request-changes'].includes(action)&&!this.canReview()||action==='execute'&&!this.canExecute())return;
  if(['approve','reject','request-changes'].includes(action)&&(!this.reason.trim()||this.reason.length>2000))return;
  const extra=action==='submit'?{reviewerId:this.reviewerId}:['approve','reject','request-changes'].includes(action)?{reason:this.reason.trim()}:{};
  this.run(this.api.action(p.batch,action,extra),b=>{this.message.set(action==='execute'?'Execution response received. Only rows with confirmed resource IDs are marked created.':'Batch updated. Review its current status before continuing.');this.load(b.id,this.page,this.filter);this.refreshList();});
 }
 confirm(sheet:ImportSheet){
  if(sheet.confirmed&&this.hasDrafts()){this.error.set('Save or discard your corrections before changing worksheet mappings.');return;}
  const p=this.preview();const t=this.tools().find(t=>t.name===this.sheetTools[sheet.id]);if(!p||!this.editable()||!t?.enabled||!this.has(t.permission))return;
  const columns=Object.fromEntries(Object.entries(this.columns[sheet.id]??{}).filter(([,v])=>!!v));const fields=Object.values(columns);
  if(!fields.length||new Set(fields).size!==fields.length||Object.entries(t.schema).some(([field,schema])=>schema.required&&!fields.includes(field))){this.error.set('Map every required field once. Resolve ambiguous mappings before confirmation.');return;}
  const pending=Object.values(this.knownRows).filter(row=>row.sheetId===sheet.id&&this.rowDirty(row.id));const corrections=Object.fromEntries(pending.map(row=>[row.id,Object.fromEntries(Object.entries(columns).map(([header,field])=>[field,this.rowValues[row.id]?.[header]??'']))]));
  this.run(this.api.mapping(p.batch,sheet.id,t.name,columns),b=>{for(const row of Object.values(this.knownRows).filter(row=>row.sheetId===sheet.id)){delete this.rowValues[row.id];delete this.baselines[row.id];}for(const [id,values] of Object.entries(corrections)){this.rowValues[id]=values;this.baselines[id]={};}this.load(b.id,this.page,this.filter);});
 }
 private requestSave(batch:ImportBatch,row:ImportRow){const values=Object.fromEntries(this.values(row).filter(field=>field in this.rowValues[row.id]).map(field=>[field,String(this.rowValues[row.id][field])]));return this.newRow(row)?this.api.addRow(batch,row.sheetId,row.id,values).pipe(map(result=>result.batch)):this.api.edit(batch,row.id,values);}
 save(row:ImportRow){const p=this.preview();if(p&&this.editable()&&this.rowConfirmed(row)&&this.domainAllowed(row.sheetId)){const added=this.newRow(row);this.run(this.requestSave(p.batch,row),b=>{this.baselines[row.id]={...this.rowValues[row.id]};if(added){this.draftRows.update(rows=>rows.filter(draft=>draft.id!==row.id));this.knownRows[row.id]=row;}this.load(b.id,added?Math.floor(p.summary.totalRows/50):this.page,added?'':this.filter);});}}
 saveAll(){const p=this.preview();if(!p||this.locked()||!this.editable())return;const rows=[...Object.values(this.knownRows).filter(row=>this.rowDirty(row.id)),...this.draftRows()];if(!rows.length)return;if(rows.some(row=>!this.rowConfirmed(row)||!this.domainAllowed(row.sheetId))){this.error.set('Confirm worksheet mappings before saving corrections.');return;}let batch=p.batch;const added=this.draftRows().length;this.run(from(rows).pipe(concatMap(row=>this.requestSave(batch,row).pipe(tap(saved=>{batch=saved;this.baselines[row.id]={...this.rowValues[row.id]};this.draftRows.update(rows=>rows.filter(draft=>draft.id!==row.id));this.knownRows[row.id]=row;}))),last()),saved=>{this.message.set('Changes saved. Validate the updated rows before submitting.');this.load(saved.id,added?Math.floor((p.summary.totalRows+added-1)/50):this.page,added?'':this.filter);});}
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
