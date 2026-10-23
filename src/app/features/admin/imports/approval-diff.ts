import { stringValues } from './ai-imports.api';
export interface ApprovalChange {field:string;before:string;after:string;change:'Added'|'Removed'|'Modified'|'No change'|'Unverified';}
function flatten(values:Record<string,string>){const result:Record<string,string>={};
 const visit=(value:unknown,path:string)=>{if(value===null||value===undefined)return;if(Array.isArray(value)){if(!value.length)result[path]='[]';else value.forEach((item,index)=>visit(item,`${path}[${index}]`));}else if(value&&typeof value==='object'){const entries=Object.entries(value);if(!entries.length)result[path]='{}';else for(const [key,item] of entries)visit(item,path?`${path}.${key}`:key);}else result[path]=value==null?'':String(value);};
 for(const [key,value] of Object.entries(values)){if(['id','expectedVersion','imageIds','imageChecksums'].includes(key))continue;if(key==='skus'){try{visit(JSON.parse(value),key);}catch{result[key]=value;}}else result[key]=value;}return result;
}
export function approvalChanges(current:string|null|undefined,proposed:string,create:boolean):ApprovalChange[]{const before=flatten(stringValues(current??undefined)),after=flatten(stringValues(proposed));const known=create||!!current&&Object.keys(before).length>0;
 return [...new Set([...Object.keys(before),...Object.keys(after)])].map(field=>({field,before:before[field]??'',after:after[field]??'',change:!known?'Unverified':before[field]===after[field]?'No change':!(field in before)?'Added':!(field in after)?'Removed':'Modified'}));
}
