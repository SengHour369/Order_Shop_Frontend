/** Explicit editable fields only. Chat text cannot submit a request or choose an actor. */
export interface ProductInputPatch {
  name?: string; description?: string; skuDescription?: string; price?: number; quantity?: number;
  warehouse?: string; category?: string; subcategory?: string; active?: boolean;
}
const aliases:Record<string,keyof ProductInputPatch>={
  'product name':'name',name:'name',named:'name',called:'name','ឈ្មោះ':'name',
  'sku description':'skuDescription','variant description':'skuDescription',description:'description','ការពិពណ៌នា':'description','base price':'price',price:'price','តម្លៃ':'price',
  stock:'quantity',quantity:'quantity','ចំនួន':'quantity','ស្តុក':'quantity',warehouse:'warehouse','ឃ្លាំង':'warehouse',
  category:'category','ប្រភេទ':'category','sub-category':'subcategory',subcategory:'subcategory','sub category':'subcategory',status:'active','ស្ថានភាព':'active',
};
export function parseProductInput(text:string):{patch:ProductInputPatch;issues:string[]} {
  const patch:ProductInputPatch={},issues:string[]=[];
  const source=text.trim().replace(/^(?:please\s+)?(?:help\s+(?:me\s+)?(?:to\s+)?)?(?:create|add)(?:\s+a|\s+new|\s+a\s+new)?\s+product\s*(?:with\s+)?/i,'');
  const fields=Object.keys(aliases).sort((a,b)=>b.length-a.length).join('|');
  const pattern=new RegExp('(?:^|[,;\\n]|\\band\\b)\\s*(?:please\\s+)?(?:(?:set|change|update)\\s+)?(?:the\\s+)?('+fields+')\\s*(?:(?:to|is)\\b|[:=])?\\s*','gi');
  const matches=[...source.matchAll(pattern)];
  matches.forEach((match,index)=>{
    const field=aliases[match[1].toLowerCase()];
    const value=source.slice(match.index!+match[0].length,matches[index+1]?.index??source.length).trim().replace(/[.;]$/,'').replace(/^["“]|["”]$/g,'');
    if(!value){issues.push(`Provide a value for ${match[1]}.`);return;}
    if(field==='price'||field==='quantity'){
      const raw=value.replace(/^\$\s*/,'').replace(/\s*(?:USD|units?)$/i,'').replace(/,/g,'');
      if(!/^\d+(?:\.\d+)?$/.test(raw)||!Number.isFinite(Number(raw))||(field==='price'?Number(raw)<=0:!Number.isSafeInteger(Number(raw)))){issues.push(field==='price'?'Price must be a positive number.':'Stock must be a non-negative whole number.');return;}
      patch[field]=Number(raw);
    }else if(field==='active'){
      if(/^(active|true|សកម្ម)$/i.test(value))patch.active=true;
      else if(/^(inactive|false|អសកម្ម)$/i.test(value))patch.active=false;
      else issues.push('Status must be Active or Inactive.');
    }else if(value.length>(field==='description'?4000:255))issues.push(`${match[1]} is too long.`);
    else patch[field]=value;
  });
  return {patch,issues};
}

/** Recognize labeled product notes, including Markdown tables, without interpreting health claims. */
export function productNotes(text:string):ProductInputPatch|null {
 const lines=text.split(/\r?\n/).map(line=>line.replace(/&#x20;|&nbsp;/gi,' ').replace(/^[\s#>*]+/,'').replace(/\*\*/g,'').trim()).filter(line=>line&&!/^[|\s:-]+$/.test(line));
 const labels:Record<string,string>={'ឈ្មោះ':'name','ឈ្មោះផលិតផល':'name','ឈ្មោះផលិតផល៖':'name','name':'name','product name':'name','ម៉ាក':'brand','brand':'brand','ប្រភេទ':'category','category':'category','ចំនួន':'pack','ទំហំវេចខ្ចប់':'pack','pack size':'pack','តម្លៃ':'price','price':'price','ស្តុក':'quantity','stock':'quantity'};
 const values:Record<string,string>={};
 for(let i=0;i<lines.length;i++){
  const cells=lines[i].replace(/^\||\|$/g,'').split(/\||[:៖]/).map(cell=>cell.trim()).filter(Boolean);
  const key=labels[cells[0]?.toLowerCase()];if(!key)continue;
  const value=cells.slice(1).join(' ').trim()||lines[i+1]?.replace(/^\||\|$/g,'').trim();
  if(value&&!labels[value.toLowerCase()]&&!/^(?:មិន|not |unknown|មិនទាន់)/i.test(value))values[key]=value;
 }
 if(!values['name']||!values['brand']&&!values['category'])return null;
 const patch:ProductInputPatch={name:values['name']};
 if(values['category'])patch.category=values['category'];
 // Retain the supplied details, including ingredients, cautions and uncertainty. These are
 // source notes for review, not verified claims. Do not silently reduce them to three fields.
 const details=lines.filter(line=>!/^\[image\]\(|^https?:\/\/|^\+\d+$|^Memorial Sloan Kettering Cancer Center$/i.test(line))
   .map(line=>line.replace(/^\||\|$/g,'').trim()).join('\n');
 patch.description=('Source notes — verify before publishing:\n'+details).slice(0,4000);
 if(values['pack'])patch.skuDescription=values['pack'];
 for(const field of ['price','quantity'] as const){const raw=values[field]?.replace(/^\$/,'').replace(/\s*USD$/i,'').trim();if(raw&&/^\d+(?:\.\d+)?$/.test(raw)&&Number(raw)>0&&(field==='price'||Number.isSafeInteger(Number(raw))))patch[field]=Number(raw);}
 return patch;
}
