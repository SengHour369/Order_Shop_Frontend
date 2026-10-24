/** Fixed read/navigation destinations only. Spoken text never becomes a URL or a write request. */
export function voiceDestination(text:string):string|null {
 const value=text.normalize('NFKC').trim().toLowerCase();
 if(!value||/\b(?:do not|don't|never|not now)\b|កុំ/.test(value))return null;
 const routes:[RegExp,string][]=[
  [/\b(?:sales? reports?|revenue reports?)\b|របាយការណ៍លក់/,'/admin/sales-report'],
  [/\bpayment reports?\b|របាយការណ៍ទូទាត់/,'/admin/payment-report'],
  [/\btax reports?\b|របាយការណ៍ពន្ធ/,'/admin/tax-report'],
  [/\b(?:customer|user) groups?\b|ក្រុមអតិថិជន/,'/admin/customer-groups'],
  [/\baccess groups?\b|ក្រុមសិទ្ធិ/,'/admin/groups'],
  [/\b(?:review authorization|approval queue|approvals)\b|ពិនិត្យសំណើ/,'/admin/review-authorization'],
  [/\bmy requests?\b|សំណើរបស់ខ្ញុំ/,'/admin/my-requests'],
  [/\b(?:request executions?|import executions?)\b/,'/admin/import-executions'],
  [/\b(?:storefront access|guest access)\b/,'/admin/storefront-access'],
  [/\bguest activity\b/,'/admin/guest-activity'],
  [/\b(?:review moderation|guest reviews?)\b/,'/admin/guest-reviews'],
  [/\b(?:stock in|receive stock)\b|ស្តុកចូល/,'/admin/inventory/stock-in'],
  [/\bstock out\b|ស្តុកចេញ/,'/admin/inventory/stock-out'],
  [/\bwarehouses?\b|ឃ្លាំង/,'/admin/inventory/warehouses'],
  [/\b(?:adjustments?|adjust stock)\b/,'/admin/inventory/adjustments'],
  [/\b(?:cancellations?|cancelled orders?|canceled orders?)\b|ការបោះបង់/,'/admin/cancellations'],
  [/\b(?:returns?|returned orders?)\b|ការប្រគល់ត្រឡប់/,'/admin/returns'],
  [/\brefunds?\b|សងប្រាក់/,'/admin/refunds'],
  [/\btransactions?\b|ប្រតិបត្តិការទូទាត់/,'/admin/transactions'],
  [/\b(?:orders?|purchases?)\b|ការបញ្ជាទិញ|បញ្ជាទិញ/,'/admin/orders'],
  [/\b(?:payments?|khqr|aba)\b|ការទូទាត់|ទូទាត់ប្រាក់/,'/admin/payments'],
  [/\bbakong\b|បាគង/,'/admin/bakong'],
  [/\b(?:categories|category)\b|ប្រភេទផលិតផល/,'/admin/categories'],
  [/\bbrands?\b|ម៉ាក/,'/admin/brands'],
  [/\b(?:inventory|stock)\b|ស្តុក/,'/admin/inventory'],
  [/\bpromotions?\b|ប្រូម៉ូសិន|ការបញ្ចុះតម្លៃ/,'/admin/promotions'],
  [/\bproducts?\b|ផលិតផល/,'/admin/products'],
  [/\bcustomers?\b|អតិថិជន/,'/admin/customers'],
  [/\b(?:users?|accounts?|staff)\b|អ្នកប្រើប្រាស់/,'/admin/users'],
  [/\bnotifications?\b|ការជូនដំណឹង/,'/admin/notifications'],
  [/\b(?:ai automation|workflows?)\b/,'/admin/ai-automation'],
  [/\bautomation\b/,'/admin/automation'],
  [/\b(?:ai assistant|chatbot|assistant)\b|ជំនួយការ/,'/admin/assistant'],
  [/\b(?:settings?|configuration)\b|ការកំណត់/,'/admin/settings'],
  [/\b(?:dashboard|overview)\b|ផ្ទាំងគ្រប់គ្រង/,'/admin'],
 ];
 return routes.find(([pattern])=>pattern.test(value))?.[1]??null;
}
