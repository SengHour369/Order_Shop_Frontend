import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PermissionService } from '../../../core/auth/permission.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AiImportsApi, ExecutionHistory, ImportBatch, ImportPreview } from './ai-imports.api';
import { ImportExecutionsComponent, executionCompleted, executionReport, executionStarted } from './import-executions.component';

const first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222',third='33333333-3333-4333-8333-333333333333';
const batch=(id=first,status='COMPLETED',ownerId=1):ImportBatch=>({id,status,ownerId,revision:2,assignedReviewerId:2,reviewerId:2,createdAt:'2026-10-01T08:00:00Z'});
function preview(id=first,status='COMPLETED'):ImportPreview{return {batch:batch(id,status,id===second?2:1),sheets:[{id:'sheet',name:'Products',tool:'PRODUCT_BULK_CREATE',confirmed:true,headers:'[]'}],mappings:[],rows:{content:[{id:'row',sheetId:'sheet',rowNumber:2,originalValues:'{}',valuesJson:'{"name":"Phone"}',status:'CREATED',edited:false,skipped:false,resourceId:'product-7',affectedResourceId:null}],totalElements:1,totalPages:1},summary:{totalRows:3,editedRows:0,statuses:{CREATED:2,FAILED:1}},errors:[]};}
function history(id=first):ExecutionHistory{return {executions:id===third?[]:[{id:'execution',revision:2,status:'COMPLETED',startedAt:id===second?'2026-10-14T10:00:00Z':'2026-10-15T10:00:00Z',completedAt:'2026-10-15T10:05:00Z'}],rows:[]};}
function setup(options:{reviewer?:boolean;empty?:boolean}={}){
 const statuses:Record<string,string>={[first]:'COMPLETED',[second]:'PARTIAL_SUCCESS',[third]:'APPROVED'};
 const api={list:vi.fn(()=>of({content:options.empty?[]:[batch(first),batch(second,'PARTIAL_SUCCESS',2),batch(third,'APPROVED')],totalPages:2,totalElements:24})),preview:vi.fn((id:string,_page=0,_status='',_size=50)=>of(preview(id,statuses[id]??'COMPLETED'))),executions:vi.fn((id:string)=>of(history(id))),history:vi.fn(()=>of({audit:[],approvals:[],revisions:[]})),download:vi.fn(()=>of(new Blob(['report']))),action:vi.fn(),tools:vi.fn(()=>of([]))};
 TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AiImportsApi,useValue:api},{provide:PermissionService,useValue:{has:()=>options.reviewer!==false}},{provide:AuthService,useValue:{session:signal({id:2})}}]});
 const fixture=TestBed.createComponent(ImportExecutionsComponent);fixture.detectChanges();return {api,fixture,page:fixture.componentInstance};
}
describe('Import execution history',()=>{
 it('loads assigned batches, bounded-size summaries and execution results without issuing writes',()=>{
  const {page,api,fixture}=setup();expect(api.list).toHaveBeenCalledWith('executions',0,true);
  expect(api.preview).toHaveBeenCalledWith(first,0,'',1);expect(page.records()).toHaveLength(3);
  expect(page.stats().map(stat=>stat.value)).toEqual([3,1,1,0]);expect(page.selectedId()).toBe(first);
  expect(fixture.nativeElement.querySelectorAll('.execution-stats article')).toHaveLength(4);expect(api.action).not.toHaveBeenCalled();
 });
 it('uses owner history when review permission is absent',()=>{const {api}=setup({reviewer:false});expect(api.list).toHaveBeenCalledWith('executions',0,false);});
 it('combines page-local search, type, status, owner and execution date filters',()=>{
  const {page}=setup();page.search.set('completed');page.type.set('Products');page.owner.set('2');page.status.set('PARTIAL_SUCCESS');page.from.set('2026-10-14');page.to.set('2026-10-14');
  expect(page.filtered().map(record=>record.batch.id)).toEqual([second]);expect(page.stats().map(stat=>stat.value)).toEqual([1,0,1,0]);
  page.to.set('2026-10-13');expect(page.filtered()).toEqual([]);
 });
 it('uses actual execution timestamps and never substitutes batch creation for start time',()=>{
  const record={batch:batch(third,'APPROVED'),preview:preview(third),history:history(third)};
  expect(executionStarted(record)).toBe('');expect(executionCompleted(record)).toBe('');
  const processing={...record,batch:batch(first,'PROCESSING'),history:history()};expect(executionCompleted(processing)).toBe('');
  expect(executionStarted({...record,history:history()})).toBe('2026-10-15T10:00:00Z');
 });
 it('shows incomplete detail reads without inventing progress or hiding known batch status',()=>{
  const {page,api}=setup();api.preview.mockReturnValue(throwError(()=>({status:503})));page.refresh();
  expect(page.records()[0].preview).toBeNull();expect(page.stats()[1].value).toBe(1);expect(page.detail()).toBeNull();expect(page.detailError()).toContain('Could not load');
 });
 it('ignores stale detail and audit reads after a different import is selected',()=>{
  const {page,api}=setup();const pending=new Subject<ImportPreview>();api.preview.mockReturnValueOnce(pending);page.open(first);page.open(second);pending.next(preview());
  expect(page.selectedId()).toBe(second);expect(page.detail()?.batch.id).toBe(second);
  const logs=new Subject<{audit:never[];approvals:never[];revisions:never[]}>();api.history.mockReturnValueOnce(logs);page.setTab('logs');page.open(first);logs.next({audit:[],approvals:[],revisions:[]});expect(page.logs()).toBeNull();
 });
 it('requests confirmed rows with the server CREATED filter and excludes rows without a resource ID',()=>{
  const {page,api}=setup();const rows=preview();rows.rows.content.push({...rows.rows.content[0],id:'unconfirmed',resourceId:null});api.preview.mockReturnValueOnce(of(rows));
  page.setTab('data');expect(api.preview).toHaveBeenLastCalledWith(first,0,'CREATED');expect(page.importedRows()).toHaveLength(1);expect(page.importedRows()[0].resourceId).toBe('product-7');
 });
 it('keeps previous failed attempts visible after a later successful result',()=>{
  const {page}=setup();page.detailHistory.set({...history(),rows:[{id:'attempt',rowId:'row',status:'FAILED',resourceId:null,errorCode:'DOMAIN_RESULT_UNCONFIRMED',idempotencyKey:'stable-key',createdAt:'2026-10-15T09:00:00Z'}]});
  expect(page.failedAttempts()).toHaveLength(1);expect(page.count('CREATED')).toBe(2);expect(page.detail()?.batch.status).toBe('COMPLETED');
 });
 it('exports selected visible batches with CSV escaping and no fabricated filenames',()=>{
  const {page}=setup();page.toggle(second);expect(page.exportable()).toHaveLength(1);expect(executionReport(page.exportable())).toContain(second);
  expect(executionReport(page.exportable())).not.toContain(first);page.status.set('COMPLETED');expect(page.exportable()).toEqual([]);
  const report=executionReport([{batch:batch(),preview:{...preview(),sheets:[{...preview().sheets[0],tool:'=bad"tool'}]},history:history()}]);expect(report).toContain('"\'=bad""tool"');expect(report).not.toContain('.xlsx');
 });
 it('opens the first import on the next batch page and retains successful pagination after list errors',()=>{
  const {page,api}=setup();api.list.mockReturnValueOnce(of({content:[batch(second,'PARTIAL_SUCCESS')],totalPages:2,totalElements:24}));page.goto(1);
  expect(page.page()).toBe(1);expect(page.selectedId()).toBe(second);api.list.mockReturnValueOnce(throwError(()=>({status:503})));page.goto(0);expect(page.page()).toBe(1);expect(page.error()).not.toBe('');
 });
 it('handles an empty history and retries log reads without triggering execution',()=>{
  const {page,api}=setup({empty:true});expect(page.records()).toEqual([]);expect(page.detail()).toBeNull();
  page.open(first);api.history.mockReturnValueOnce(throwError(()=>({status:503})));page.setTab('logs');expect(page.logsError()).toContain('Could not load');page.loadLogs();expect(page.logs()).not.toBeNull();expect(api.action).not.toHaveBeenCalled();
 });
});
