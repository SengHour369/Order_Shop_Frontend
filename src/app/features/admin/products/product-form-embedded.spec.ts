import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ProductFormPage } from './products.page';
import { AdminApi } from '../api/admin.api';
import { AiImportsApi } from '../imports/ai-imports.api';
import { PermissionService } from '../../../core/auth/permission.service';

describe('Native product form embedded in chat',()=>{
  const stage=vi.fn();
  const product=vi.fn();
  beforeEach(()=>{
    stage.mockReset().mockReturnValue(of({id:'batch-1',status:'DRAFT'}));product.mockReset();
    TestBed.configureTestingModule({providers:[provideRouter([]),
      {provide:ActivatedRoute,useValue:{paramMap:of(convertToParamMap({id:'55'})),snapshot:{queryParamMap:convertToParamMap({duplicate:'99'})}}},
      {provide:AdminApi,useValue:{product,allCategories:()=>of([{id:1,name:'Shoes'}]),allBrands:()=>of([{id:2,name:'Running',categoryId:1}])}},
      {provide:AiImportsApi,useValue:{reviewerOptions:()=>of({reviewers:[],defaultReviewerId:null}),stageProduct:stage,action:()=>of({id:'batch-1',status:'SUBMITTED'})}},
      {provide:PermissionService,useValue:{has:()=>true,allows:()=>true}},
    ]});
  });
  function create(){const f=TestBed.createComponent(ProductFormPage);f.componentRef.setInput('embedded',true);f.componentRef.setInput('prefill',{name:'Running Shoe',description:'Black size 42',price:120,quantity:20,warehouse:'Main'});f.detectChanges();return f;}
  it('uses the actual product editor with SKU, image and real category controls',async()=>{
    const f=create(),form=f.componentInstance;await f.whenStable();f.detectChanges();
    expect(f.nativeElement.querySelector('.product-editor')).toBeTruthy();
    expect(f.nativeElement.querySelector('input[name="name"]').value).toBe('Running Shoe');
    expect(f.nativeElement.querySelector('app-product-select')).toBeTruthy();
    expect(f.nativeElement.textContent).toContain('Product Variants');expect(f.nativeElement.textContent).toContain('Submit for Approval');
    expect(form.basePrice).toBe(120);expect(form.baseQuantity).toBe(20);expect(form.id).toBe(0);expect(product).not.toHaveBeenCalled();expect(stage).not.toHaveBeenCalled();
  });
  it('saves through the existing draft service and keeps the conversation open',()=>{
    const f=create(),form=f.componentInstance;const navigate=vi.spyOn(TestBed.inject(Router),'navigate');const saved=vi.fn();form.saved.subscribe(saved);form.subCategoryId=2;
    form.save(false);
    expect(stage).toHaveBeenCalledOnce();expect(saved).toHaveBeenCalledWith({id:'batch-1',status:'DRAFT'});expect(navigate).not.toHaveBeenCalled();
  });
  it('fills only requested fields, resolves real category names and keeps manual edits',()=>{
    const f=create(),form=f.componentInstance;form.description='Manually edited';form.files=[new File(['image'],'shoe.png',{type:'image/png'})];
    const result=form.applyChatInput({price:99,quantity:7,category:'Shoes',subcategory:'Running'});f.detectChanges();
    expect(form.basePrice).toBe(99);expect(form.baseQuantity).toBe(7);expect(form.categoryId).toBe(1);expect(form.subCategoryId).toBe(2);expect(result.issues).toEqual([]);
    expect(form.description).toBe('Manually edited');expect(form.files).toHaveLength(1);expect(stage).not.toHaveBeenCalled();
    expect(form.applyChatInput({category:'Invented category'}).issues.length).toBe(1);expect(form.categoryId).toBe(1);
  });
  it('asks which SKU to edit instead of changing every variant',()=>{
    const f=create(),form=f.componentInstance;form.hasVariants=true;
    expect(form.applyChatInput({price:30}).issues[0]).toContain('multiple variants');expect(form.basePrice).toBe(120);expect(stage).not.toHaveBeenCalled();
  });
  it('retains the existing reviewer validation before submission',()=>{
    const f=create();f.componentInstance.save();expect(f.componentInstance.error()).toContain('independent reviewer');expect(stage).not.toHaveBeenCalled();
  });
  it('prefills the supplied pack SKU and resolves only existing categories after catalog loading',()=>{
    const f=TestBed.createComponent(ProductFormPage);f.componentRef.setInput('embedded',true);
    f.componentRef.setInput('prefill',{name:'SOVIA-F',description:'Source ingredients and cautions',skuDescription:'15 capsules',categoryName:'Shoes',quantity:0});f.detectChanges();
    const form=f.componentInstance;expect(form.variants[0].description).toBe('15 capsules');expect(form.categoryId).toBe(1);
    expect(form.baseQuantity).toBe(0);expect(form.basePrice).toBe(0);expect(stage).not.toHaveBeenCalled();
  });
});
