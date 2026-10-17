import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';
import { NotificationsApi } from './notifications.api';
import { Notice } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { CustomerStore } from '../../core/stores/customer.store';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Icon } from '../../shared/components/icon';
import { SignInCard } from '../../shared/components/sign-in-card';
import { PageState } from '../../shared/utils/page-state';
import { Status } from '../../shared/components/status';
type Category='all'|'orders'|'promotions'|'account'|'system';
@Component({imports:[FormsModule,TranslatePipe,DatePipe,RouterLink,Icon,SignInCard,Status],templateUrl:'./notifications.html',styleUrl:'./notifications.scss'})
export class NotificationsPage extends PageState {
  private readonly router=inject(Router);
  readonly admin=this.router.url.startsWith('/admin');
  search=''; status='all'; period='all'; total=0; checked=new Set<number>();
  private readonly api=inject(NotificationsApi);
  readonly auth=inject(AuthService);
  readonly store=inject(CustomerStore);
  private readonly language=inject(LanguageService);
  private readonly noticesDestroyRef=inject(DestroyRef);
  private countRequest?:Subscription;
  readonly notices=signal<Notice[]>([]);
  readonly selected=signal<Notice|null>(null);
  readonly actionBusy=signal(false);
  readonly actionError=signal('');
  readonly clock=signal(Date.now());
  readonly detailDialog=viewChild.required<ElementRef<HTMLDialogElement>>('detailEditor');
  readonly tabs:{key:Category;label:string}[]=[{key:'all',label:'All'},{key:'orders',label:'Orders'},{key:'promotions',label:'Promotions'},{key:'account',label:'Account'},{key:'system',label:'System'}];
  page=1; pages=0; filter:Category='all';
  constructor(){super();this.load();const timer=setInterval(()=>this.clock.set(Date.now()),60000);this.noticesDestroyRef.onDestroy(()=>clearInterval(timer));}
  load(page=this.page){
    if(!this.auth.session()||this.busy()||this.actionBusy())return;
    this.run(this.api.list(page),result=>{
      this.total=result.totalElements;this.checked.clear();this.notices.set(result.content);this.page=page;this.pages=result.totalPages;
      if(this.selected())this.selected.set(result.content.find(n=>n.id===this.selected()!.id)||null);
      this.updateCount();
    });
  }
  goto(page:number){if(page<1||page>this.pages||this.busy()||this.actionBusy())return;this.load(page);}
  updateCount(){
    this.countRequest?.unsubscribe();
    this.countRequest=this.api.count().pipe(takeUntilDestroyed(this.noticesDestroyRef)).subscribe({next:result=>this.store.unread.set(result.count),error:()=>this.store.unread.set(null)});
  }
  category(n:Notice):Exclude<Category,'all'>{
    const type=(n.type||'').toUpperCase(),resource=(n.resourceType||'').toUpperCase();
    if(/^(ORDER|PAYMENT|RETURN|REFUND)(_|$)/.test(type)||['ORDER','PAYMENT','RETURN','REFUND'].includes(resource))return 'orders';
    if(/^(PROMOTION|SALE|OFFER)(_|$)/.test(type)||resource==='PROMOTION')return 'promotions';
    if(/^(ACCOUNT|SECURITY|PASSWORD|LOGIN|USER)(_|$)/.test(type)||['ACCOUNT','USER','SECURITY'].includes(resource))return 'account';
    return 'system';
  }
  filtered(){return this.notices().filter(n=>(this.filter==='all'||this.category(n)===this.filter)&&(!this.admin||((this.status==='all'||(this.status==='read')===n.read)&&`${n.title} ${n.message}`.toLowerCase().includes(this.search.toLowerCase())&&(this.period==='all'||this.clock()-Date.parse(n.createdAt)<=Number(this.period)*86400000))));}
  toggleChecked(id:number){this.checked.has(id)?this.checked.delete(id):this.checked.add(id);}
  pageNumbers(){return Array.from({length:Math.min(5,this.pages)},(_,i)=>Math.max(1,Math.min(this.page-2,this.pages-4))+i);}

  count(category:Category){return this.notices().filter(n=>category==='all'||this.category(n)===category).length;}
  select(notice:Notice){if(this.admin){void this.router.navigate(['/admin/notifications',notice.id],{state:{notificationIds:this.notices().map(n=>n.id)}});return;}this.selected.set(notice);this.actionError.set('');this.detailDialog().nativeElement.showModal();if(!notice.read)this.read(notice.id);}
  close(){this.detailDialog().nativeElement.close();this.selected.set(null);}
  read(id:number){
    if(!this.auth.session()||this.actionBusy()||this.busy())return;
    this.mutate(()=>this.api.read(id),()=>{
      this.notices.update(rows=>rows.map(n=>n.id===id?{...n,read:true}:n));
      if(this.selected()?.id===id)this.selected.update(n=>n?{...n,read:true}:null);
    });
  }
  readChecked(){
    if(!this.auth.session()||this.busy()||this.actionBusy())return;
    const ids=this.notices().filter(n=>this.checked.has(n.id)&&!n.read).map(n=>n.id);
    if(!ids.length)return;
    this.mutate(()=>forkJoin(ids.map(id=>this.api.read(id))),()=>{this.notices.update(rows=>rows.map(n=>ids.includes(n.id)?{...n,read:true}:n));this.checked.clear();});
  }
  readAll(){
    if(!this.auth.session()||this.actionBusy()||this.busy()||this.store.unread()===0)return;
    this.mutate(()=>this.api.readAll(),()=>{this.notices.update(rows=>rows.map(n=>({...n,read:true})));this.selected.update(n=>n?{...n,read:true}:null);});
  }
  private mutate(request:()=>ReturnType<NotificationsApi['read']>,success:()=>void){
    this.actionBusy.set(true);this.actionError.set('');
    request().pipe(takeUntilDestroyed(this.noticesDestroyRef)).subscribe({
      next:()=>{success();this.actionBusy.set(false);this.updateCount();},
      error:e=>{this.actionBusy.set(false);this.actionError.set(e.status===0?'Cannot reach the shop. Please try again shortly.':e.error?.message||e.message||'Could not mark notifications as read. Please try again.');},
      complete:()=>this.actionBusy.set(false),
    });
  }
  icon(n:Notice){
    const type=(n.type||'').toUpperCase();
    if(this.category(n)==='account')return 'shield';if(this.category(n)==='promotions')return 'tag';
    if(type.includes('PAYMENT'))return 'card';if(type.includes('RETURN')||type.includes('REFUND'))return 'box';
    if(type.includes('PROCESS'))return 'settings';if(type.includes('SHIPP')||type.includes('DELIVERY')||type==='ORDER_UPDATED')return 'truck';
    return type.startsWith('ORDER')?'box':'bell';
  }
  relativeTime(date:string){
    const value=Date.parse(date);if(!Number.isFinite(value))return this.language.translate('Date unavailable');
    const seconds=Math.max(0,(this.clock()-value)/1000);if(seconds<60)return this.language.translate('Just now');
    const formatter=new Intl.RelativeTimeFormat(this.language.language()==='km'?'km':'en',{numeric:'always'});
    if(seconds<3600)return formatter.format(-Math.floor(seconds/60),'minute');if(seconds<86400)return formatter.format(-Math.floor(seconds/3600),'hour');if(seconds<7*86400)return formatter.format(-Math.floor(seconds/86400),'day');
    return new Intl.DateTimeFormat(this.language.language()==='km'?'km':'en',{month:'short',day:'numeric',year:'numeric'}).format(value);
  }
  destination(n:Notice):string[]|null{
    const type=(n.resourceType||'').toUpperCase(),id=n.resourceId||'';
    if(type==='ORDER'&&/^[1-9]\d*$/.test(id))return [this.admin?'/admin/orders':'/account/orders',id];
    if(type==='RETURN'&&/^RET[A-Za-z0-9_-]{1,76}$/.test(id))return ['/account/returns',id];
    if(type==='PRODUCT'&&/^[1-9]\d*$/.test(id))return ['/shop',id];return null;
  }
}
