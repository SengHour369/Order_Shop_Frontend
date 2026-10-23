import { ApiClient } from '../../../core/api/api-client';
import { AuthService } from '../../../core/auth/auth.service';
import { GuestApi } from '../../../core/storefront/guest.api';
import { StorefrontAccessService } from '../../../core/storefront/storefront-access.service';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Icon } from '../../../shared/components/icon';
import { ProductImage } from '../../../shared/components/product-image';

/** Backend-supplied review data. Verified purchase must never be inferred in the UI. */
export interface ProductReview {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
  photos: string[];
  helpfulCount: number;
}

@Component({
  selector: 'app-product-reviews',
  imports: [DatePipe, FormsModule, TranslatePipe, Icon, ProductImage],
  templateUrl: './product-reviews.html',
  styleUrl: './product-reviews.scss',
})
export class ProductReviews {
  private api = inject(ApiClient);
  auth = inject(AuthService);
  private guest = inject(GuestApi);
  access = inject(StorefrontAccessService);
  productId = input(0);
  skuId = input(0);
  private loaded = signal<ProductReview[]>([]);
  private ready = signal(false);
  allReviews = computed(() => this.productId() ? this.loaded() : this.reviews());
  reviewAvailable = computed(() => this.available() || this.ready());
  writing = signal(false);
  submitting = signal(false);
  submissionMessage = signal('');
  draft = {author:'', rating:5, title:'', body:'', email:'', code:''};
  constructor() {
    effect(onCleanup => {
      const id=this.productId(); if(!id) return;
      this.ready.set(false);this.loaded.set([]);
      const path=this.auth.session() ? '/api/v1/products/' : '/api/v1/storefront/products/';
      const subscription=this.api.get<ProductReview[]>(path+id+'/reviews').subscribe({next: rows=>{this.loaded.set(rows);this.ready.set(true);}, error:()=>this.ready.set(false)});
      const settings=this.access.load().subscribe({error:()=>{}});
      onCleanup(()=>{subscription.unsubscribe();settings.unsubscribe();});
    });
  }
  canWrite() {return !!this.productId() && (!!this.auth.session() || !!this.access.settings()?.guestReviews);}
  sendCode() {if(this.submitting()) return;this.submitting.set(true);this.guest.sendCode(this.draft.email).subscribe({next:()=>{this.submitting.set(false);this.submissionMessage.set('Verification code sent.');},error:()=>{this.submitting.set(false);this.submissionMessage.set('Could not send verification code. Try again later.');}});}
  verifyCode() {if(this.submitting()) return;this.submitting.set(true);this.guest.verifyCode(this.draft.email,this.draft.code).subscribe({next:()=>{this.submitting.set(false);this.submissionMessage.set('Email verified.');},error:()=>{this.submitting.set(false);this.submissionMessage.set('Invalid or expired verification code.');}});}
  submit() {
    if(!this.canWrite() || this.submitting()) return;
    this.submitting.set(true);this.submissionMessage.set('');
    const {rating,title,body,author}=this.draft;
    const request=this.auth.session() ? this.api.post('/api/v1/products/'+this.productId()+'/reviews',{rating,title,body}) :
      this.guest.request('POST','/reviews',{productId:this.productId(),skuId:this.skuId(),author,rating,title,body});
    request.subscribe({next:()=>{this.submitting.set(false);this.writing.set(false);this.submissionMessage.set('Review submitted for moderation. It will appear after approval.');},error:()=>{this.submitting.set(false);this.submissionMessage.set('Review could not be submitted. Guests must verify their contact. You may already have reviewed this product.');}});
  }
  reviews = input<readonly ProductReview[]>([]);
  available = input(false);
  search = signal('');
  rating = signal(0);
  photosOnly = signal(false);
  sort = signal('recent');
  stars = [5, 4, 3, 2, 1];
  total = computed(() => this.allReviews().length);
  average = computed(() => this.total() ? this.allReviews().reduce((sum, review) => sum + review.rating, 0) / this.total() : 0);
  averageLabel = computed(() => this.average().toFixed(1));
  withPhotos = computed(() => this.allReviews().filter(review => review.photos.length > 0).length);
  distribution = computed(() => this.stars.map(stars => {
    const count = this.allReviews().filter(review => review.rating === stars).length;
    return { stars, count, percent: this.total() ? Math.round(count / this.total() * 100) : 0 };
  }));
  filtered = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    const rows = this.allReviews().filter(review =>
      (!this.rating() || review.rating === this.rating()) &&
      (!this.photosOnly() || review.photos.length > 0) &&
      (!search || [review.author, review.title, review.body].some(text => text.toLocaleLowerCase().includes(search))),
    );
    return [...rows].sort((a, b) => this.sort() === 'helpful' ? b.helpfulCount - a.helpfulCount :
      this.sort() === 'highest' ? b.rating - a.rating : Date.parse(b.createdAt) - Date.parse(a.createdAt));
  });
  reset() { this.search.set(''); this.rating.set(0); this.photosOnly.set(false); }
  initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
}
