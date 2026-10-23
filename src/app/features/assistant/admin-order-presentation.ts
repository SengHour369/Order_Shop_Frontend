import { AiResult } from './assistant.api';
import { ChatPresentation } from './chat-presentation';

/** Compatibility with older deployed chat APIs. Views always re-fetch via authorized domain APIs. */
export function adminOrderPresentation(result:AiResult):ChatPresentation | undefined {
  if(result.presentation){
    const records=Array.isArray(result.data)?result.data.filter((row):row is Record<string,unknown>=>!!row&&typeof row==='object'&&!Array.isArray(row)):undefined;
    return {...result.presentation,blocks:result.presentation.blocks.map(block=>
      records&&((block.kind==='orders.list'&&result.intent==='ADMIN_ORDER_LIST')||(block.kind==='payments.list'&&result.intent==='ADMIN_PAYMENT_LIST'))?{...block,records}:block)};
  }
  if(result.status!=='SUCCESS')return undefined;
  if(result.intent==='ADMIN_ORDER_LIST')return {schemaVersion:'1.0',blocks:[{kind:'orders.list'}]};
  if(!['ORDER_GET','MY_ORDER_STATUS'].includes(result.intent || ''))return undefined;
  const row=result.data && typeof result.data==='object' && !Array.isArray(result.data)?result.data as Record<string,unknown>:null;
  const id=row?.['id'] ?? row?.['orderId'];
  if(typeof id!=='number'||!Number.isSafeInteger(id)||id<1)return undefined;
  return {schemaVersion:'1.0',blocks:[{kind:'orders.detail',entityId:id}]};
}
