import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../core/auth/auth.service';
import { ScannerPage, MAX_SCAN_IMAGE_BYTES } from './scanner.page';
import { ScanResult } from './scanner.api';

const scanUrl = '/api/v1/product-scanner/scan';
const recognizeUrl = '/api/v1/product-scanner/recognize';
const found: ScanResult = { found:true,productId:7,productSkuId:71,name:'Wireless Headphones',sku:'HEADPHONE-BLACK',originalPrice:179.99,finalPrice:129.99,availableQuantity:3,availableForSale:true,imageUrl:'/images/product-placeholder.svg',variant:[{name:'Color',value:'Black'}] };

describe('Product scanner', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),
      {provide:AuthService,useValue:{session:()=>({id:1,role:'CUSTOMER'}),userId:()=>1}}] });
    http = TestBed.inject(HttpTestingController);
    vi.stubGlobal('URL', Object.assign(URL, {createObjectURL:vi.fn(()=> 'blob:test-photo'),revokeObjectURL:vi.fn()}));
  });
  afterEach(() => { http.verify(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  function page() { return TestBed.createComponent(ScannerPage); }
  function lookup(component: ScannerPage, result = found) { component.code='HEADPHONE-BLACK'; component.scan(); http.expectOne(scanUrl).flush({data:result}); }

  it('renders camera controls without requesting permission automatically', () => {
    const camera = vi.fn(); vi.stubGlobal('navigator', {mediaDevices:{getUserMedia:camera}});
    const fixture=page(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Product Scanner');
    expect(fixture.nativeElement.querySelector('[aria-label="Capture and scan product"]').disabled).toBe(true);
    expect(camera).not.toHaveBeenCalled();
  });
  it('uses SKU lookup and renders the real price, variant and cart action', () => {
    const fixture=page(); const component=fixture.componentInstance;
    lookup(component); fixture.detectChanges();
    expect(component.discount()).toBe(28);
    expect(fixture.nativeElement.textContent).toContain('$129.99');
    expect(fixture.nativeElement.textContent).toContain('Black');
    component.add(); component.add();
    const request=http.expectOne(req=>req.url==='/api/v1/cart/user/id/items');
    expect(request.request.body).toEqual({product_id:71,quantity:1});
    request.flush({data:{total_items:1}});
    expect(component.store.cartCount()).toBe(1);
  });
  it('does not allow purchase of unavailable or unknown-price results', () => {
    const component=page().componentInstance;
    lookup(component,{...found,availableForSale:false}); component.add();
    expect(component.canAdd()).toBe(false);
    lookup(component,{...found,finalPrice:undefined}); component.add();
    expect(component.canAdd()).toBe(false);
    http.expectNone(req=>req.url.includes('/cart/'));
  });
  it('clears old matches when a new barcode has no result', () => {
    const component=page().componentInstance; lookup(component);
    lookup(component,{found:false});
    expect(component.product()).toBeNull();
    expect(component.message()).toContain('No product found');
  });
  it('uses catalog name search only when requested', () => {
    const component=page().componentInstance; component.lookupType='name'; component.code='headphones'; component.scan();
    const request=http.expectOne('/api/v1/products/get/all');
    expect(request.request.body.criteria_value).toBe('headphones'); request.flush({data:{payload:[]}});
    expect(component.message()).toContain('No products found'); http.expectNone(scanUrl);
  });
  it('rejects oversized and unsupported photos before uploading', () => {
    const component=page().componentInstance;
    const oversized = new File(['x'],'big.jpg',{type:'image/jpeg'});
    Object.defineProperty(oversized, 'size', {value: MAX_SCAN_IMAGE_BYTES + 1});
    component.recognizeFile(oversized);
    expect(component.error()).toContain('4,000 MB');
    component.recognizeFile(new File(['x'],'bad.svg',{type:'image/svg+xml'}));
    http.expectNone(recognizeUrl);
  });
  it('accepts the 4000 MB boundary without decoding a large preview', () => {
    const component=page().componentInstance;
    const file=new File(['x'],'large.jpg',{type:'image/jpeg'});
    Object.defineProperty(file,'size',{value:MAX_SCAN_IMAGE_BYTES});
    component.recognizeFile(file);
    expect(component.preview()).toBe('');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    http.expectOne(recognizeUrl).flush({data:{matchType:'AI_UNAVAILABLE',candidates:[]}});
  });
  it('uploads multipart photos and requires selection for uncertain matches', () => {
    const component=page().componentInstance; const file=new File(['photo'],'photo.jpg',{type:'image/jpeg'});
    component.recognizeFile(file); const request=http.expectOne(recognizeUrl);
    expect(request.request.body.get('image')).toBe(file);
    request.flush({data:{matchType:'AI_IMAGE',exact:false,requiresSelection:true,message:'Choose a match',candidates:[{productId:7,name:'Headphones',sku:'HEADPHONE-BLACK',confidence:.7}]}});
    expect(component.product()).toBeNull(); expect(component.candidates()).toHaveLength(1); http.expectNone(scanUrl);
    component.selectCandidate(component.candidates()[0]); http.expectOne(scanUrl).flush({data:found});
    expect(component.product()?.id).toBe(7);
  });
  it('resolves one exact image match to current stock and price', () => {
    const component=page().componentInstance; component.recognizeFile(new File(['x'],'p.png',{type:'image/png'}));
    http.expectOne(recognizeUrl).flush({data:{matchType:'AI_IMAGE',exact:true,requiresSelection:false,message:'Found',candidates:[{productId:7,name:'Headphones',sku:'HEADPHONE-BLACK',confidence:.99}]}});
    http.expectOne(scanUrl).flush({data:found}); expect(component.sku()?.finalPrice).toBe(129.99);
  });
  it('offers manual search when photo recognition is unavailable', () => {
    const fixture=page(); const component=fixture.componentInstance;
    component.recognizeFile(new File(['x'],'p.png',{type:'image/png'}));
    http.expectOne(recognizeUrl).flush({data:{matchType:'AI_UNAVAILABLE',exact:false,requiresSelection:false,candidates:[]}});
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('temporarily unavailable');
    expect(fixture.nativeElement.querySelector('[aria-label="Find product"]')).toBeTruthy();
  });
  it('unlocks lookup after a server or business error', () => {
    const component=page().componentInstance; component.code='code'; component.scan();
    http.expectOne(scanUrl).flush({success:false,status:400,message:'Invalid barcode'});
    expect(component.busy()).toBe(false); expect(component.error()).toBe('Invalid barcode');
    component.scan(); http.expectOne(scanUrl).flush({}, {status:503,statusText:'Unavailable'});
    expect(component.busy()).toBe(false);
  });
  it('shows a useful denied-camera fallback', async () => {
    vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:vi.fn().mockRejectedValue(new DOMException('Denied','NotAllowedError'))}});
    const component=page().componentInstance; await component.startCamera();
    expect(component.cameraReady()).toBe(false); expect(component.cameraError()).toContain('denied');
  });
  it('stops a camera permission response received after leaving camera mode', async () => {
    let resolve!: (stream:MediaStream)=>void;
    const stop=vi.fn();
    vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:()=>new Promise<MediaStream>(r=>resolve=r)}});
    const fixture=page(); fixture.detectChanges(); const component=fixture.componentInstance;
    const opening=component.startCamera(); component.setMode('manual');
    resolve({getTracks:()=>[{stop}]} as unknown as MediaStream); await opening;
    expect(stop).toHaveBeenCalled(); expect(component.cameraReady()).toBe(false);
  });
  it('releases camera tracks and photo URLs on destruction', async () => {
    const stop=vi.fn(); const track={stop,getCapabilities:()=>({torch:true})};
    vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:vi.fn().mockResolvedValue({getTracks:()=>[track],getVideoTracks:()=>[track]})}});
    vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
    const fixture=page(); fixture.detectChanges(); const component=fixture.componentInstance;
    await component.startCamera(); expect(component.cameraReady()).toBe(true);
    component.preview.set('blob:test-photo'); fixture.destroy();
    expect(stop).toHaveBeenCalled(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-photo');
  });
});
