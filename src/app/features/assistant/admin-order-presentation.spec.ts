import { adminOrderPresentation } from './admin-order-presentation';
import { AiResult } from './assistant.api';
describe('Older admin order responses',()=>{
 const result=(intent:string,data:unknown,status='SUCCESS'):AiResult=>({executionId:null,status,message:'Orders',intent,data});
 it('renders old admin order lists as the native in-chat table',()=>{
   expect(adminOrderPresentation(result('ADMIN_ORDER_LIST',[]))?.blocks).toEqual([{kind:'orders.list'}]);
 });
 it('renders direct lookup references in chat without trusting data as current details',()=>{
   expect(adminOrderPresentation(result('ORDER_GET',{id:12,order_number:'ORD-12'}))?.blocks).toEqual([{kind:'orders.detail',entityId:12}]);
   expect(adminOrderPresentation(result('ORDER_GET',{id:'12'}))).toBeUndefined();
   expect(adminOrderPresentation(result('ORDER_GET',{id:-1}))).toBeUndefined();
 });
 it('does not turn failed or scoped order lists into an admin-wide list',()=>{
   expect(adminOrderPresentation(result('ADMIN_ORDER_LIST',[], 'DENIED'))).toBeUndefined();
   expect(adminOrderPresentation(result('ORDER_LIST',[]))).toBeUndefined();
   expect(adminOrderPresentation(result('PRODUCT_GET',{id:12}))).toBeUndefined();
 });
});
