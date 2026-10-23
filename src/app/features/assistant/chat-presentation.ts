/** Angular controls this allowlist. Model output cannot select a class or URL. */
export type ChatUiBlock =
  | { kind: 'orders.list'; records?: Record<string,unknown>[]; date?: string }
  | { kind: 'orders.detail'; entityId: number }
  | { kind: 'payments.list'; records?: Record<string,unknown>[] }
  | { kind: 'inventory.list' | 'inventory.low-stock' | 'products.list' | 'promotions.list' | 'cart.checkout' }
  | { kind: 'error.notice'; explanation: string };
export interface ChatPresentation {
  schemaVersion: '1.0';
  blocks: ChatUiBlock[];
}

/** Validate server-selected views before a voice response can instantiate a native component. */
export function validChatPresentation(value:unknown):value is ChatPresentation {
 if(!value||typeof value!=='object')return false;
 const row=value as Record<string,unknown>;
 if(row['schemaVersion']!=='1.0'||!Array.isArray(row['blocks'])||!row['blocks'].length||row['blocks'].length>4)return false;
 return row['blocks'].every((item:unknown)=>{
  if(!item||typeof item!=='object')return false;const block=item as Record<string,unknown>;
  if(['inventory.list','inventory.low-stock','products.list','promotions.list','cart.checkout'].includes(String(block['kind'])))return true;
  if(block['kind']==='orders.detail')return typeof block['entityId']==='number'&&Number.isSafeInteger(block['entityId'])&&block['entityId']>0;
  if(block['kind']==='error.notice')return typeof block['explanation']==='string';
  if(block['kind']==='orders.list'||block['kind']==='payments.list')return (block['records']===undefined||Array.isArray(block['records'])&&block['records'].length<=100&&block['records'].every((record:unknown)=>record&&typeof record==='object'&&!Array.isArray(record)))&&(block['date']===undefined||typeof block['date']==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(block['date']));
  return false;
 });
}
