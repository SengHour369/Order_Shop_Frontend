import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {AiImportsApi,ImportBatch} from './ai-imports.api';
const batch:ImportBatch={id:'11111111-1111-4111-8111-111111111111',revision:8,status:'SUBMITTED',ownerId:1,assignedReviewerId:2};
describe('Excel import API contracts',()=>{
 let http:HttpTestingController;let api:AiImportsApi;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);api=TestBed.inject(AiImportsApi);});afterEach(()=>http.verify());
 it('creates a staged row using a stable client row ID, current version and string values',()=>{
  api.addRow(batch,'sheet','row-uuid',{name:'New category',status:'true'}).subscribe();const request=http.expectOne('/api/ai/imports/'+batch.id+'/sheets/sheet/rows');
  expect(request.request.method).toBe('POST');expect(request.request.body).toEqual({version:8,rowId:'row-uuid',values:{name:'New category',status:'true'}});request.flush({batch:{...batch,revision:9},row:{id:'row-uuid'}});
 });
 it('uses the versioned skip endpoint to exclude a staged row without deleting it',()=>{
  const row={id:'row',sheetId:'sheet',rowNumber:2,originalValues:'{}',valuesJson:'{}',status:'VALID',edited:false,skipped:false,resourceId:null,affectedResourceId:null};
  api.skip(batch,row).subscribe();const request=http.expectOne('/api/ai/imports/'+batch.id+'/rows/row/skip');
  expect(request.request.method).toBe('PATCH');expect(request.request.body).toEqual({version:8,skipped:true});request.flush({...batch,revision:9});
 });
 it('sends immutable version with approval and current values with correction',()=>{api.action(batch,'approve',{reason:'Reviewed',version:99}).subscribe();const r=http.expectOne('/api/ai/imports/'+batch.id+'/approve');expect(r.request.body).toEqual({reason:'Reviewed',version:8});r.flush(batch);api.edit(batch,'row',{name:'Correction'}).subscribe();const edit=http.expectOne('/api/ai/imports/'+batch.id+'/rows/row');expect(edit.request.method).toBe('PATCH');expect(edit.request.body).toEqual({version:8,values:{name:'Correction'}});edit.flush(batch);});
 it('uses assigned history and server-side edited filters',()=>{api.list('executions',2,true).subscribe();const r=http.expectOne(q=>q.url==='/api/ai/imports');expect(r.request.params.get('assigned')).toBe('true');expect(r.request.params.get('page')).toBe('2');r.flush({content:[],totalPages:0,totalElements:0});api.preview(batch.id,1,'EDITED').subscribe();const p=http.expectOne(q=>q.url.endsWith('/preview'));expect(p.request.params.get('status')).toBe('EDITED');expect(p.request.params.get('size')).toBe('50');p.flush({});});
 it('downloads authenticated server reports without generating unsafe client CSV',()=>{api.download(batch.id,'report').subscribe();const r=http.expectOne('/api/ai/imports/'+batch.id+'/report');expect(r.request.responseType).toBe('blob');r.flush(new Blob(['report']));});
 it('binds image attachment and removal to the current revision and retrieves authenticated blobs',()=>{
  const file=new File(['image'],'photo.png',{type:'image/png'});
  api.attachImage(batch,'row',file).subscribe();
  const upload=http.expectOne(r=>r.url.endsWith('/rows/row/images'));
  expect(upload.request.body.get('file')).toBe(file);
  expect(upload.request.params.get('version')).toBe('8');upload.flush(batch);
  api.detachImage(batch,'row','image').subscribe();
  const remove=http.expectOne(r=>r.url.endsWith('/rows/row/images/image/detach'));
  expect(remove.request.body).toEqual({version:8});remove.flush(batch);
  api.image(batch.id,'image').subscribe();
  const preview=http.expectOne(r=>r.url.endsWith('/images/image'));
  expect(preview.request.responseType).toBe('blob');preview.flush(new Blob(['image']));
 });
 it('stages manual product DTO fields and files through the shared approval engine',()=>{
  const file=new File(['bytes'],'photo.png',{type:'image/png'});api.stageProduct({name:'Product',description:'Description',is_active:true,sub_category_id:3,skus:[{price:12,quantity:0}]},[file],42,7).subscribe();
  const request=http.expectOne('/api/ai/imports/manual-product');expect(request.request.method).toBe('POST');expect(request.request.body.getAll('files')).toEqual([file]);
  const row=JSON.parse(request.request.body.get('row'));expect(row.tool).toBe('PRODUCT_BULK_UPDATE');expect(row.values).toMatchObject({id:'42',expectedVersion:'7',name:'Product',subCategoryId:'3',isActive:'true'});expect(JSON.parse(row.values.skus)).toEqual([{price:12,quantity:0}]);expect(row.values.promotionPrice).toBeUndefined();expect(row.values.brand).toBeUndefined();request.flush(batch);
 });

});
