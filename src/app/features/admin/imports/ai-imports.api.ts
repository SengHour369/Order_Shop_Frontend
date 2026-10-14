import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client';
export interface ImportBatch {id:string;revision:number;status:string;ownerId:number;assignedReviewerId:number|null;reviewerId?:number|null;lastEditorId?:number|null;createdAt?:string;requestId?:string;traceId?:string;}
export interface ImportSheet {id:string;name:string;tool:string|null;confirmed:boolean;headers:string;}
export interface ImportRow {id:string;sheetId:string;rowNumber:number;originalValues:string;valuesJson:string;status:string;edited:boolean;skipped:boolean;resourceId:string|null;affectedResourceId:string|null;}
export interface ImportTool {name:string;permission:string;enabled:boolean;unavailableReason:string;schema:Record<string,{type:string;required:boolean}>;risk:string;confirmationRequired:boolean;handler:string;}
export interface ImportPage<T>{content:T[];totalPages:number;totalElements:number;}
export interface ImportPreview{batch:ImportBatch;sheets:ImportSheet[];mappings:{sheetId:string;suggestions:string;confirmedValues:string}[];rows:ImportPage<ImportRow>;errors:{rowId:string;message:string;explanation?:string}[];summary:{totalRows:number;editedRows:number;statuses:Record<string,number>};}
export interface RowExecution{id:string;rowId:string;status:string;resourceId:string|null;errorCode:string|null;idempotencyKey:string;createdAt:string;}
export interface ExecutionHistory{executions:{id:string;revision:number;status:string;completedAt:string|null}[];rows:RowExecution[];}
export type ImportAction='analyze'|'validate'|'submit'|'approve'|'reject'|'request-changes'|'execute';
export type ImportMode='upload'|'review'|'executions';
export function stringValues(text?:string):Record<string,string>{try{const v=JSON.parse(text??'{}');return v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).filter((entry):entry is [string,string]=>typeof entry[1]==='string')):{}}catch{return {}}}
@Injectable({providedIn:'root'})
export class AiImportsApi{
 private api=inject(ApiClient);private root='/api/ai/imports';
 tools(){return this.api.get<ImportTool[]>(this.root+'/tools');}
 list(mode:ImportMode,page=0,assigned=false){return this.api.get<ImportPage<ImportBatch>>(this.root,{page,review:String(mode==='review'),assigned:String(assigned)});}
 upload(file:File){const body=new FormData();body.append('file',file);return this.api.post<ImportBatch>(this.root+'/upload',body);}
 preview(id:string,page=0,status=''){return this.api.get<ImportPreview>(`${this.root}/${encodeURIComponent(id)}/preview`,{page,size:50,...(status?{status}:{})});}
 action(batch:ImportBatch,action:ImportAction,extra:object={}){return this.api.post<ImportBatch>(`${this.root}/${encodeURIComponent(batch.id)}/${action}`,{...extra,version:batch.revision});}
 mapping(batch:ImportBatch,sheetId:string,tool:string,columns:Record<string,string>){return this.api.patch<ImportBatch>(`${this.root}/${batch.id}/sheets/${sheetId}`,{version:batch.revision,tool,columns});}
 edit(batch:ImportBatch,rowId:string,values:Record<string,string>){return this.api.patch<ImportBatch>(`${this.root}/${batch.id}/rows/${rowId}`,{version:batch.revision,values});}
 skip(batch:ImportBatch,row:ImportRow){return this.api.patch<ImportBatch>(`${this.root}/${batch.id}/rows/${row.id}/skip`,{version:batch.revision,skipped:!row.skipped});}
 executions(id:string){return this.api.get<ExecutionHistory>(`${this.root}/${id}/executions`);}
 history(id:string){return this.api.get<{audit:unknown[];approvals:unknown[];revisions:unknown[]}>(`${this.root}/${id}/history`);}
 download(id:string,kind:'report'|'original'){return this.api.http.get(this.api.url(`${this.root}/${id}/${kind}`),{responseType:'blob'});}
}
