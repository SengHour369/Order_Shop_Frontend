import { Component, computed, input, signal } from '@angular/core';
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
  reviews = input<readonly ProductReview[]>([]);
  available = input(false);
  search = signal('');
  rating = signal(0);
  photosOnly = signal(false);
  sort = signal('recent');
  stars = [5, 4, 3, 2, 1];
  total = computed(() => this.reviews().length);
  average = computed(() => this.total() ? this.reviews().reduce((sum, review) => sum + review.rating, 0) / this.total() : 0);
  averageLabel = computed(() => this.average().toFixed(1));
  withPhotos = computed(() => this.reviews().filter(review => review.photos.length > 0).length);
  distribution = computed(() => this.stars.map(stars => {
    const count = this.reviews().filter(review => review.rating === stars).length;
    return { stars, count, percent: this.total() ? Math.round(count / this.total() * 100) : 0 };
  }));
  filtered = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    const rows = this.reviews().filter(review =>
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
