import { decodeVoiceResult, stableArguments } from './voice-events';
const envelope=()=>({event:{schemaVersion:1,eventId:'session:tool',type:'PRODUCT_SEARCH_RESULTS',conversationId:'chat'},modelResult:{status:'SUCCESS',context:{selectedProductId:1,productIdsInDisplayOrder:[1,2]}},display:{conversationId:'chat',cardType:'ProductList',suggestions:[],result:{status:'SUCCESS',intent:'PRODUCT_SEARCH',message:'Actual results',data:[]}}});
describe('Voice event schema',()=>{
 it('accepts verified search cards and pending confirmations',()=>{expect(decodeVoiceResult(envelope(),'chat').event.type).toBe('PRODUCT_SEARCH_RESULTS');const pending=envelope();pending.modelResult.status='NEEDS_CONFIRMATION';pending.display.result.status='NEEDS_CONFIRMATION';expect(()=>decodeVoiceResult(pending,'chat')).not.toThrow();});
 it('rejects cross-conversation cards, unknown events and invalid references',()=>{const wrong=envelope();wrong.display.conversationId='other';expect(()=>decodeVoiceResult(wrong,'chat')).toThrow();const invalid=envelope();invalid.modelResult.context.selectedProductId=-1;expect(()=>decodeVoiceResult(invalid,'chat')).toThrow();const unknown=envelope();unknown.event.type='AUTO_CONFIRM';expect(()=>decodeVoiceResult(unknown,'chat')).toThrow();expect(()=>decodeVoiceResult({},'chat')).toThrow();});
 it('canonicalizes arguments for retry deduplication',()=>{expect(stableArguments({query:'Nike ស្បែកជើង',maxPrice:100})).toBe(stableArguments({maxPrice:100,query:'Nike ស្បែកជើង'}));});
});

describe('Voice UI instructions',()=>{
 it('accepts only the server workspace allowlist',()=>{
  const value={...envelope(),display:{...envelope().display,presentation:{schemaVersion:'1.0',blocks:[{kind:'products.list'},{kind:'payments.list'},{kind:'cart.checkout'}]}}};
  expect(()=>decodeVoiceResult(value,'chat')).not.toThrow();value.display.presentation.blocks=[{kind:'script'}];expect(()=>decodeVoiceResult(value,'chat')).toThrow('Invalid UI presentation');
 });
});
