import { validChatPresentation } from '../chat-presentation';
import { ChatResponse } from '../assistant.api';
export type VoiceResultType='PRODUCT_SEARCH_RESULTS'|'PRODUCT_SELECTED'|'PRODUCT_DETAIL_LOADED'|'CART_UPDATED'|'CHECKOUT_READY'|'PAYMENT_QR_READY'|'PAYMENT_STATUS_UPDATED'|'ADMIN_RESULT'|'TOOL_RESULT'|'ERROR';
export interface VoiceContext {selectedProductId?:number;selectedSkuId?:number;productIdsInDisplayOrder?:number[];preferredLanguage?:string;}
export interface VoiceResultEvent {schemaVersion:1;eventId:string;type:VoiceResultType;conversationId:string;}
export interface VoiceToolResponse {event:VoiceResultEvent;display?:ChatResponse;modelResult:Record<string,unknown>&{status:string;context?:VoiceContext};}
export type VoiceSyncEvent =
 | {type:'VOICE_CONNECTED'|'VOICE_ENDED';conversationId:string}
 | {type:'VOICE_TRANSCRIPT_UPDATED'|'AI_VOICE_RESPONSE';conversationId:string;turnId:string;text:string}
 | {type:'PRODUCT_SEARCH_STARTED';conversationId:string;callId:string}
 | {type:VoiceResultType;conversationId:string;result:VoiceToolResponse};
const types=new Set<VoiceResultType>(['PRODUCT_SEARCH_RESULTS','PRODUCT_SELECTED','PRODUCT_DETAIL_LOADED','CART_UPDATED','CHECKOUT_READY','PAYMENT_QR_READY','PAYMENT_STATUS_UPDATED','ADMIN_RESULT','TOOL_RESULT','ERROR']);
const states=new Set(['SUCCESS','RUNNING','NEEDS_INPUT','NEEDS_CONFIRMATION','DENIED','UNKNOWN','FAILURE']);
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function id(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>0;}
export function decodeVoiceResult(value:unknown,conversationId:string):VoiceToolResponse {
 if(!record(value)||!record(value['event'])||!record(value['modelResult']))throw new Error('Invalid voice result envelope');
 const event=value['event'],result=value['modelResult'];
 if(event['schemaVersion']!==1||typeof event['eventId']!=='string'||!event['eventId'].trim()||event['eventId'].length>250||event['conversationId']!==conversationId||!types.has(event['type'] as VoiceResultType)||!states.has(result['status'] as string))throw new Error('Invalid voice event');
 const context=result['context'];
 if(context!==undefined){
  if(!record(context))throw new Error('Invalid voice context');
  for(const key of ['selectedProductId','selectedSkuId'])if(context[key]!==undefined&&!id(context[key]))throw new Error('Invalid selected product/SKU');
  if(context['productIdsInDisplayOrder']!==undefined&&(!Array.isArray(context['productIdsInDisplayOrder'])||context['productIdsInDisplayOrder'].length>20||!context['productIdsInDisplayOrder'].every(id)))throw new Error('Invalid product order');
 }
 const display=value['display'];
 if(display!==undefined){
  if(!record(display)||display['conversationId']!==conversationId||typeof display['cardType']!=='string'||!Array.isArray(display['suggestions'])||!display['suggestions'].every(s=>typeof s==='string')||!record(display['result']))throw new Error('Invalid chat display');
  if(display['presentation']!==undefined&&display['presentation']!==null&&!validChatPresentation(display['presentation']))throw new Error('Invalid UI presentation');
  const response=display['result'];
  if(typeof response['message']!=='string'||!states.has(response['status'] as string)||typeof response['intent']!=='string')throw new Error('Invalid commerce result');
 }
 return value as unknown as VoiceToolResponse;
}
export function stableArguments(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(stableArguments).join(',')+']';
 if(record(value))return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stableArguments(value[key])).join(',')+'}';
 return JSON.stringify(value)??'null';
}
