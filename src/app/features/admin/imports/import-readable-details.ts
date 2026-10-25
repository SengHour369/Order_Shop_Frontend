import { Component, computed, input } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ExecutionHistory, stringValues } from './ai-imports.api';

export function isImportIdentifier(key:string){return key==='id'||/(?:Id|Ids)$/.test(key)||/(?:^|_)ids?$/i.test(key);}

export function importLabel(value:string) {
  const labels:Record<string,string>={skus:'SKUs',is_default:'Default SKU',operatorProductAttribute:'Uses product attributes',product_attributes:'Product attributes',low_stock_threshold:'Low stock threshold',lowStockThreshold:'Low stock threshold',warehouse_location:'Warehouse location',subCategoryId:'Subcategory',productId:'Product',skuId:'SKU',inventoryId:'Inventory',branchId:'Branch',isActive:'Active',startAt:'Starts at',endAt:'Ends at',PARTIAL_SUCCESS:'Completed with issues',DOMAIN_RESULT_UNCONFIRMED:'Creation could not be confirmed'};
  return labels[value]??value.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ').toLowerCase().replace(/^./,letter=>letter.toUpperCase());
}
@Component({selector:'app-import-values',imports:[NgTemplateOutlet],template:`
<dl class="import-values">@for(field of fields();track field.key){<div><dt>{{ label(field.key) }}</dt><dd><ng-container [ngTemplateOutlet]="valueTree" [ngTemplateOutletContext]="{$implicit:field.value,key:field.key,level:0}"/></dd></div>}@empty{<p>No values recorded.</p>}</dl>
<ng-template #valueTree let-value let-key="key" let-level="level">
 @if(level>=8){<span>Open the product editor to view further details.</span>}
 @else if(isArray(value)){<div class="value-items">@for(item of value;track $index){<section class="value-item"><h4>{{key==='skus'?'SKU':'Item'}} {{$index+1}}</h4><ng-container [ngTemplateOutlet]="valueTree" [ngTemplateOutletContext]="{$implicit:decode(item),key:key,level:level+1}"/></section>}@empty{<span>None</span>}</div>}
 @else if(isObject(value)){<dl class="nested-values">@for(field of entries(value);track field.key){<div><dt>{{label(field.key)}}</dt><dd><ng-container [ngTemplateOutlet]="valueTree" [ngTemplateOutletContext]="{$implicit:field.value,key:field.key,level:level+1}"/></dd></div>}@empty{<span>No details recorded.</span>}</dl>}
 @else{<span>{{display(value)}}</span>}
</ng-template>
`,styles:[`:host{display:block;min-width:0}.import-values,.nested-values{margin:5px 0;font-size:13px;width:100%;min-width:0}.import-values>div,.nested-values>div{display:grid;grid-template-columns:minmax(110px,180px) minmax(0,1fr);gap:16px;padding:10px 0;border-bottom:1px solid var(--admin-border,#e4e9ed)}.import-values>div:last-child,.nested-values>div:last-child{border:0}dt{color:#647087}dd{margin:0;color:#294263;white-space:normal;overflow-wrap:anywhere;min-width:0;line-height:1.65}.value-items{display:grid;gap:12px}.value-item{border:1px solid var(--admin-border,#e4e9ed);border-radius:8px;padding:12px 16px;background:#fbfdfc}.value-item h4{margin:0 0 8px;font-size:13px;color:#00834a}.nested-values>div{grid-template-columns:minmax(90px,140px) minmax(0,1fr);gap:12px;padding:7px 0}.nested-values .nested-values>div{grid-template-columns:1fr;gap:3px}p{color:#647087}@media(max-width:700px){.import-values>div,.nested-values>div{grid-template-columns:1fr;gap:5px}.value-item{padding:10px}.import-values,.nested-values{font-size:13px}}`]})
export class ImportValuesComponent {
  values=input('');label=importLabel;
  decode(value:unknown):unknown{if(typeof value==='string'&&/^[\[{]/.test(value.trim())){try{return JSON.parse(value);}catch{return value;}}return value;}
  isArray(value:unknown):value is unknown[]{return Array.isArray(value);}
  isObject(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
  entries(value:Record<string,unknown>){return Object.entries(value).filter(([key])=>!isImportIdentifier(key)&&key!=='imageChecksums').map(([key,item])=>({key,value:this.decode(item)}));}
  display(value:unknown){if(value===null||value===undefined||value==='')return '—';if(typeof value==='boolean'||value==='true'||value==='false')return value===true||value==='true'?'Yes':'No';return String(value);}
  fields=computed(()=>this.entries(stringValues(this.values())));
}

@Component({selector:'app-import-activity',imports:[DatePipe],template:`
 @if(executions().length){<section><h4>Execution activity</h4><div class="activity-scroll"><table><thead><tr><th>Version</th><th>Result</th><th>Started</th><th>Completed</th></tr></thead><tbody>@for(run of executions();track run.id){<tr><td>{{ run.revision }}</td><td>{{ label(run.status) }}</td><td>{{ date(run.startedAt) | date:'medium' }}</td><td>{{ date(run.completedAt) ? (date(run.completedAt) | date:'medium') : 'Not completed' }}</td></tr>}</tbody></table></div></section>}
 @if(history()){
  <section><h4>Activity history</h4><div class="activity-scroll"><table><thead><tr><th>Activity</th><th>User</th><th>Version</th><th>Date</th></tr></thead><tbody>@for(row of rows('audit');track $index){<tr><td>{{ label(value(row,'action')) }}</td><td>{{ user(row) }}</td><td>{{ value(row,'revision') }}</td><td>{{ date(value(row,'createdAt')) | date:'medium' }}</td></tr>}@empty{<tr><td colspan="4">No activity recorded.</td></tr>}</tbody></table></div></section>
  <section><h4>Review decisions</h4><div class="activity-scroll"><table><thead><tr><th>Decision</th><th>Reviewer</th><th>Reason</th><th>Version</th><th>Date</th></tr></thead><tbody>@for(row of rows('approvals');track $index){<tr><td>{{ label(value(row,'decision')) }}</td><td>{{ user(row) }}</td><td class="reason">{{ value(row,'reason') }}</td><td>{{ value(row,'revision') }}</td><td>{{ date(value(row,'createdAt')) | date:'medium' }}</td></tr>}@empty{<tr><td colspan="5">No review decisions recorded.</td></tr>}</tbody></table></div></section>
  <section><h4>Saved versions</h4><div class="version-list">@for(row of rows('revisions');track $index){<span>Version {{ value(row,'revision') }} <small>{{ date(value(row,'createdAt')) | date:'medium' }}</small></span>}@empty{<p>No saved versions recorded.</p>}</div></section>
 }@else if(!executions().length){<p class="empty-activity">No execution activity recorded.</p>}
 `,styles:[`:host{display:block;color:#426084;font-size:11px}section{margin:0 0 18px}h4{font-size:12px;font-weight:600;margin:0 0 10px;color:#3b587c}.activity-scroll{overflow:auto;border:1px solid var(--admin-border, #e4e9ed);border-radius:6px}table{width:100%;border-collapse:collapse;min-width:500px;font-size:11px}th{text-align:left;padding:10px 12px;background:#f5f8fd;font-weight:500;color:#7188a7}td{padding:10px 12px;border-top:1px solid var(--admin-border, #e4e9ed);white-space:nowrap}.reason{white-space:normal;min-width:160px;max-width:440px;overflow-wrap:anywhere}.version-list{display:flex;gap:10px;flex-wrap:wrap}.version-list>span{padding:10px 14px;border:1px solid var(--admin-border, #e4e9ed);border-radius:6px}.version-list small{display:block;color:#91a3bb;margin-top:5px}.empty-activity,p{color:#8a9cb5}`]})
export class ImportActivityComponent {
  executions=input<ExecutionHistory['executions']>([]);history=input<unknown>(null);label=importLabel;
  rows(key:string):Record<string,unknown>[]{const history=this.history();if(!history||typeof history!=='object')return [];const rows=(history as Record<string,unknown>)[key];return Array.isArray(rows)?rows.filter(row=>row&&typeof row==='object'&&!Array.isArray(row)):[];}
  value(row:Record<string,unknown>,key:string){const value=row[key];return ['string','number','boolean'].includes(typeof value)?String(value):'—';}
  user(row:Record<string,unknown>){for(const key of ['actorName','actorUsername','reviewerName','username']){const name=this.value(row,key);if(name!=='—')return name;}return 'Recorded user';}
  date(value:unknown){if(typeof value!=='string'||!value||Number.isNaN(Date.parse(value)))return null;return value;}
}
