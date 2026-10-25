import {finalize} from 'rxjs';
import {Component,computed,effect,inject,input,signal} from '@angular/core';
import {Icon} from '../../../shared/components/icon';
import {AiImportsApi,ImportBatch,ImportImage,stringValues} from './ai-imports.api';
import {ImportActivityComponent} from './import-readable-details';
import {AdminApi} from '../api/admin.api';
type Row=Record<string,any>;
@Component({selector:'app-request-product-detail',imports:[Icon,ImportActivityComponent],templateUrl:'./request-product-detail.html',styleUrls:['../products/product-detail.css','./request-product-detail.css']})
export class RequestProductDetail {
 values=input('');batch=input.required<ImportBatch>();rowId=input.required<string>();images=input<ImportImage[]>([]);history=input<unknown>(null);
 private imports=inject(AiImportsApi);private catalog=inject(AdminApi);
 readonly selectedImage=signal(0);readonly activeTab=signal('Variants (SKUs)');readonly detailTabs=['Variants (SKUs)','Attributes','Inventory','History'];readonly imageError=signal('');readonly imageLoading=signal(false);private urls=signal<string[]>([]);private brand=signal<Row>({});
 readonly row=computed<Row>(()=>{const values=stringValues(this.values());return {...values,skus:this.decode(values['skus'],[]),created_at:this.batch().createdAt,updated_at:this.batch().submittedAt};});
 constructor(){
  effect(onCleanup=>{const batch=this.batch(),images=this.images().filter(image=>image.rowId===this.rowId());this.urls.set([]);this.selectedImage.set(0);this.imageError.set('');const urls:string[]=new Array(images.length).fill('');let remaining=images.length;this.imageLoading.set(remaining>0);const subscriptions=images.map((image,index)=>this.imports.image(batch.id,image.id).pipe(finalize(()=>{remaining--;if(!remaining)this.imageLoading.set(false);})).subscribe({next:blob=>{if(!['image/png','image/jpeg','image/webp'].includes(blob.type)){this.imageError.set('A submitted image could not be displayed.');return;}urls[index]=URL.createObjectURL(blob);this.urls.set(urls.filter(Boolean));},error:()=>this.imageError.set('A submitted image could not be loaded. Open Attachments to retry.')}));onCleanup(()=>{subscriptions.forEach(s=>s.unsubscribe());urls.forEach(url=>URL.revokeObjectURL(url));});});
  effect(onCleanup=>{const id=Number(this.row()['subCategoryId']);this.brand.set({});if(!Number.isSafeInteger(id)||id<1)return;const subscription=this.catalog.brand(id).subscribe({next:brand=>this.brand.set(brand),error:()=>{}});onCleanup(()=>subscription.unsubscribe());});
 }
 decode(value:unknown,fallback:unknown){if(typeof value!=='string')return value??fallback;try{return JSON.parse(value);}catch{return fallback;}}
 field(row:Row,...keys:string[]){for(const key of keys)if(row?.[key]!==null&&row?.[key]!==undefined&&row[key]!=='')return row[key];return '';}
 text(value:unknown){return value===null||value===undefined||value===''?'—':String(value);}
 usd(value:unknown){return value!==''&&value!==null&&value!==undefined&&Number.isFinite(Number(value))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)):'—';}
 when(value:unknown){return typeof value==='string'&&!Number.isNaN(Date.parse(value))?new Date(value).toLocaleString():'—';}
 imagesOf(_row:Row){return this.urls();}
 skus(product:Row):Row[]{return Array.isArray(product['skus'])?product['skus'].filter((v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)):[];}
 activeRow(product:Row){const value=this.field(product,'isActive','is_active','status');return value===true||value==='true'?true:value===false||value==='false'?false:null;}
 categoryOf(product:Row){return this.field(product,'category_name','categoryName')||this.field(this.brand(),'category_name','categoryName')||this.brand()['category']?.name||'Not included in request';}
 brandOf(product:Row){return this.field(product,'subcategory_name','brandName')||this.field(this.brand(),'name')||'Not included in request';}
 skuImage(_sku:Row,_product:Row){return this.urls()[0]??'';}
 attrsOf(sku:Row):Row[]{const rows=this.decode(this.field(sku,'product_attributes','productAttributes','attributes'),[]);return Array.isArray(rows)?rows.filter(v=>v&&typeof v==='object'):[];}
 attrText(attr:Row){const values=this.decode(attr['attributes']??attr['values'],[]);return Array.isArray(values)?values.map(v=>typeof v==='object'&&v?this.field(v,'value','name'):v).filter(v=>v!==''&&v!==null).join(', '):this.text(attr['value']);}
 inventory(sku:Row):Row{return sku['inventory']&&typeof sku['inventory']==='object'?sku['inventory']:sku;}
 stockOf(sku:Row){return this.field(this.inventory(sku),'stock_qty','stockQty','quantity')??'';}
 warehouseOf(sku:Row){return this.field(this.inventory(sku),'warehouse_location','warehouseLocation','warehouse');}
 inventoryRows(product:Row){return this.skus(product).map(sku=>({warehouse:this.warehouseOf(sku),stock:this.stockOf(sku),reserved:this.field(this.inventory(sku),'reserved_qty','reservedQty','reserved'),available:this.field(this.inventory(sku),'available_qty','availableQty','available')}));}
 attributeRows(product:Row){const rows=new Map<string,Set<string>>();for(const sku of this.skus(product))for(const attr of this.attrsOf(sku)){const name=this.text(attr['name']);if(!rows.has(name))rows.set(name,new Set());for(const value of this.attrText(attr).split(',').map(v=>v.trim()).filter(v=>v&&v!=='—'))rows.get(name)!.add(value);}return [...rows].map(([name,values])=>({name,values:[...values]}));}
}
