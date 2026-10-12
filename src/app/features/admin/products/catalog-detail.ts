import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon';
import { ProductImage } from '../../../shared/components/product-image';
import { field, Row, text, when } from '../api/admin.api';
@Component({
  selector: 'app-catalog-detail',
  imports: [TranslatePipe, RouterLink, Icon, ProductImage],
  templateUrl: './catalog-detail.html',
  styleUrl: '../styles/details.css',
})
export class CatalogDetail {
  row = input.required<Row>();
  kind = input.required<'Category' | 'Brand'>();
  field = field;
  text = text;
  when = when;
  base() { return this.kind() === 'Brand' ? '/admin/brands' : '/admin/categories'; }
  plural() { return this.kind() === 'Brand' ? 'Brands' : 'Categories'; }
  image() { return String(field(this.row(), this.kind() === 'Brand' ? 'image' : 'icon') || ''); }
  status() {
    const raw = field(this.row(), 'status', 'Status', 'is_active', 'isActive');
    if (raw === true || String(raw).toLowerCase() === 'active') return 'Active';
    if (raw === false || String(raw).toLowerCase() === 'inactive') return 'Inactive';
    return text(raw);
  }
}
