import {voiceDestination} from './voice-navigation';
describe('Spoken admin navigation',()=>{
 it.each([
  ['I want to check user orders','/admin/orders'],['សូមបង្ហាញការបញ្ជាទិញរបស់អតិថិជន','/admin/orders'],
  ['Show payment report','/admin/payment-report'],['Open customer groups','/admin/customer-groups'],
  ['Check products','/admin/products'],['Check user data','/admin/users'],['Show warehouse stock','/admin/inventory/warehouses'],
  ['Open AI Automation','/admin/ai-automation'],['ពិនិត្យស្តុក','/admin/inventory'],['Show cancelled orders','/admin/cancellations'],
 ])('resolves %s to a fixed page', (text,path)=>expect(voiceDestination(text)).toBe(path));
 it.each(['Do not open orders','កុំបើកផលិតផល','https://example.com','សួស្តី','   '])('does not invent navigation for %s',text=>expect(voiceDestination(text)).toBeNull());
});
