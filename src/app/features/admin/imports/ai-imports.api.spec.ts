import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {AiImportsApi,ImportBatch} from './ai-imports.api';
const batch:ImportBatch={id:'11111111-1111-4111-8111-111111111111',revision:8,status:'SUBMITTED',ownerId:1,assignedReviewerId:2};
describe('Excel import API contracts',()=>{
 let http:HttpTestingController;let api:AiImportsApi;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);api=TestBed.inject(AiImportsApi);});afterEach(()=>http.verify());
 it('uploads workbook bytes as multipart without serializing cells into prompts',()=>{const file=new File(['bytes'],'categories.xlsx');api.upload(file).subscribe();const r=http.expectOne('/api/ai/imports/upload');expect(r.request.method).toBe('POST');expect(r.request.body.get('file')).toBe(file);expect(r.request.headers.has('Content-Type')).toBe(false);r.flush(batch);});
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
});
