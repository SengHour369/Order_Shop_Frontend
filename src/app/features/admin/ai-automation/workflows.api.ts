import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client';
export interface WorkflowStep {key:string; name:string; tool:string; parameters:Record<string,unknown>;next?:string;}
export interface Definition {name:string;description:string;module:string;triggerType:string;steps:WorkflowStep[];category?:string;tags?:string;priority?:string;}
export interface Draft {id:string;revision:number;status:'DRAFT';definition:Definition;updatedAt:string;}
export interface Tool {code:string;description:string;module:string;risk:string;parameters:Record<string,{type:string;required:boolean}>;}
export interface Validation {valid:boolean;mode:string;executed:boolean;errors:string[];steps:{key:string;status:string;errors:string[]}[];checkedAt:string;}
export interface PublishedVersion {id:string;workflowId:string;draftRevision:number;name:string;definition:string;publishedAt:string;}
export interface WorkflowRun {id:string;publishedVersionId:string;ownerId:number;status:string;startedAt:string;finishedAt:string|null;requestId:string;traceId:string|null;}
export interface RunStep {id:string;stepKey:string;position:number;name:string;tool:string;status:string;startedAt:string|null;finishedAt:string|null;errorCode:string|null;outputSha256:string|null;outputBytes:number|null;}
export interface RunDetail {run:WorkflowRun;steps:RunStep[];}
export interface WorkflowTemplate {id:string;name:string;module:string;definition:Definition;requiresInput:boolean;}
export interface WorkflowLog {id:number;occurredAt:string;status:string;stepKey:string;tool:string;errorCode:string|null;requestId:string;}
export interface WorkflowSummary {totalWorkflows?:number;publishedWorkflows:number;executions7Days:number;succeeded7Days:number;failed7Days:number;running7Days:number;}
export interface WorkflowCatalog {tools:Tool[];triggerTypes:string[];executionAvailable:boolean;manualReadOnlyExecutionAvailable?:boolean;executableToolCodes?:string[];limitation:string;}
@Injectable({providedIn:'root'})
export class WorkflowsApi {
 private api=inject(ApiClient);private base='/api/ai/admin/workflows';
 list(page:number,search:string){return this.api.get<{items:Draft[];total:number}>(this.base,{page,search});}
 catalog(){return this.api.get<WorkflowCatalog>(this.base+'/catalog');}
 save(definition:Definition,draft:Draft|null){const body={definition,revision:draft?.revision??null};return draft?this.api.put<Draft>(this.base+'/'+encodeURIComponent(draft.id),body):this.api.post<Draft>(this.base,body);}
 templates(){return this.api.get<WorkflowTemplate[]>(this.base+'/templates');}
 propose(prompt:string){return this.api.post<{definition:Definition;confidence:number;executed:boolean;validation:Validation}>(this.base+'/propose',{prompt});}
 cancel(id:string){return this.api.post<RunDetail>(this.base+'/executions/'+encodeURIComponent(id)+'/cancel',{});}
 rerun(id:string,key:string){return this.api.post<RunDetail>(this.base+'/executions/'+encodeURIComponent(id)+'/rerun',{idempotencyKey:key});}
 summary(){return this.api.get<WorkflowSummary>(this.base+'/summary');}
 versions(id:string){return this.api.get<PublishedVersion[]>(this.base+'/'+encodeURIComponent(id)+'/versions');}
 publish(draft:Draft){return this.api.post<PublishedVersion>(this.base+'/'+encodeURIComponent(draft.id)+'/publish',{revision:draft.revision});}
 execute(versionId:string,key:string){return this.api.post<RunDetail>(this.base+'/versions/'+encodeURIComponent(versionId)+'/execute',{idempotencyKey:key});}
 executions(page:number,filters:Record<string,string>={}){return this.api.get<{items:WorkflowRun[];total:number;totalPages?:number;workflows?:Record<string,{workflowId:string;name:string;revision:number}>}>(this.base+'/executions',{page,...Object.fromEntries(Object.entries(filters).filter(([,value])=>!!value))});}
 logs(id:string,page=0){return this.api.get<{items:WorkflowLog[];total:number;totalPages:number}>(this.base+'/executions/'+encodeURIComponent(id)+'/logs',{page});}
 execution(id:string){return this.api.get<RunDetail>(this.base+'/executions/'+encodeURIComponent(id));}
 validate(definition:Definition){return this.api.post<Validation>(this.base+'/validate',{definition});}
}
