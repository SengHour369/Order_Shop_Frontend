import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AuthService } from '../../core/auth/auth.service';
import { Address } from '../../core/api/models';
import { Icon } from '../../shared/components/icon';
import { Status } from '../../shared/components/status';
import { PageState } from '../../shared/utils/page-state';
import { AddressesApi } from './addresses.api';

@Component({
  imports: [FormsModule, RouterLink, TranslatePipe, Icon, Status],
  templateUrl: './address-form.html', styleUrl: './address-form.scss',
})
export class AddressFormPage extends PageState {
  private readonly api = inject(AddressesApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  id: number | null = null;
  loaded = true;
  submitted = false;
  prefix = '+855';
  phone = '';
  readonly labels = [{ name: 'Home', icon: 'home' }, { name: 'Office', icon: 'bank' }, { name: 'Parents Home', icon: 'pin' }, { name: 'Other', icon: 'box' }];
  readonly countries = ['Cambodia', 'Thailand', 'Vietnam', 'United States'];
  readonly provinces = ['Phnom Penh','Banteay Meanchey','Battambang','Kampong Cham','Kampong Chhnang','Kampong Speu','Kampong Thom','Kampot','Kandal','Kep','Koh Kong','Kratie','Mondulkiri','Oddar Meanchey','Pailin','Preah Sihanouk','Preah Vihear','Prey Veng','Pursat','Ratanakiri','Siem Reap','Stung Treng','Svay Rieng','Takeo','Tboung Khmum'];
  form: Omit<Address, 'id'> = this.blank();
  constructor() {
    super();
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const value = params.get('id');
      this.id = value === null ? null : Number(value);
      this.form = this.blank(); this.phone = ''; this.prefix = '+855'; this.submitted = false;
      if (this.id !== null && (!Number.isSafeInteger(this.id) || this.id < 1)) { this.loaded = false; this.error.set('Invalid address.'); return; }
      this.loaded = this.id === null;
      if (this.id) this.load();
    });
  }
  private blank(): Omit<Address, 'id'> {
    return { label: 'Home', recipient_name: this.auth.session()?.username || '', phone_number: '', address_line1: '', city: '', district: '', commune: '', zip_code: '', country: 'Cambodia', additional_information: '', is_default: false };
  }
  load() {
    if (!this.id || !this.auth.session()) return;
    this.run(this.api.list().pipe(map(rows => {
      const address = rows.find(row => row.id === this.id);
      if (!address) throw new Error('Address not found in your account.');
      return address;
    })), address => {
      const { id, ...body } = address;
      this.form = { ...this.blank(), ...body };
      const number = address.phone_number || '';
      const prefix = ['+855', '+66', '+84', '+1'].find(value => number.startsWith(value));
      this.prefix = prefix || '+855'; this.phone = prefix ? number.slice(prefix.length) : number;
      this.loaded = true;
    }, true);
  }
  save() {
    if (this.busy() || !this.loaded || !this.auth.session()) return;
    this.submitted = true;
    const phone = this.phone.replace(/[\s()-]/g, '');
    const body = { ...this.form, label: this.form.label?.trim(), recipient_name: this.form.recipient_name?.trim(), phone_number: this.prefix + phone, district: this.form.district?.trim(), commune: this.form.commune?.trim(), address_line1: this.form.address_line1.trim(), city: this.form.city.trim(), zip_code: this.form.zip_code.trim(), country: this.form.country.trim(), additional_information: this.form.additional_information?.trim() || '' };
    if (!body.recipient_name || !body.district || !body.commune || !body.address_line1 || !body.city || !body.zip_code || !body.country || !this.labels.some(label => label.name === body.label) || !/^\d{6,15}$/.test(phone) || !/^\+\d{7,15}$/.test(body.phone_number) || body.city.length > 100 || body.country.length > 100 || body.zip_code.length > 20 || body.address_line1.length > 255 || body.recipient_name.length > 100 || body.district.length > 100 || body.commune.length > 100 || body.additional_information.length > 500) {
      this.error.set('Please complete all required fields with valid details.'); return;
    }
    this.run(this.id ? this.api.update(this.id, body) : this.api.create(body), saved => {
      // Old servers ignore unknown request fields. Do not claim all delivery details were saved.
      if (saved.recipient_name !== body.recipient_name || saved.phone_number !== body.phone_number || saved.label !== body.label || saved.district !== body.district || saved.commune !== body.commune || (saved.additional_information || '') !== body.additional_information) {
        this.id = saved.id;
        this.error.set('The address server needs an update to save all delivery details. Please contact support.'); return;
      }
      void this.router.navigate(['/account/addresses']);
    });
  }
}
