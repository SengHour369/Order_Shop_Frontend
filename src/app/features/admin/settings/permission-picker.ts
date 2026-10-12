import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Row } from '../api/admin.api';

@Component({
  selector: 'app-permission-picker',
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="permission-picker">
      <header><div><span class="eyebrow">{{ 'ACCESS CONTROL' | translate }}</span><h3>{{ 'Permissions' | translate }}</h3>
        <p>{{ 'Select what this account or group can access.' | translate }}</p></div><strong class="count">{{ selected().size }} {{ 'Selected' | translate }}</strong></header>
      <div class="toolbar"><input type="search" aria-label="Search permissions" [placeholder]="'Search permissions or modules…' | translate"
        [ngModel]="query()" (ngModelChange)="query.set($event); limit.set(100)" [ngModelOptions]="{standalone:true}" />
        <button type="button" (click)="selectVisible()" [disabled]="disabled()">{{ 'Select results' | translate }}</button>
        <button type="button" (click)="clear()" [disabled]="disabled()">{{ 'Clear' | translate }}</button></div>
      <div class="modules">
      @for (module of modules(); track module) {
        <section class="module"><header><h4>{{ module.replaceAll('_', ' ') }}</h4>
          <label><input type="checkbox" [checked]="moduleSelected(module)" [disabled]="disabled()"
            (change)="toggleModule(module)" /> {{ 'Select module' | translate }}</label></header>
          @for (permission of moduleRows(module); track permission['func_id']) {
            <label class="permission" [class.selected]="selected().has(id(permission))">
              <input type="checkbox" [checked]="selected().has(id(permission))"
                [disabled]="disabled() || locked().has(id(permission))" (change)="toggle(id(permission))" />
              <span><strong>{{ permission['func_name'] }}</strong><small>{{ permission['func_code'] }}</small></span>
            </label>
          }
        </section>
      } @empty { <p class="empty">{{ 'No active permissions match your search.' | translate }}</p> }
      </div>
      @if (matching().length > visible().length) {
        <div class="toolbar"><span>{{ visible().length }} / {{ matching().length }}</span><button type="button" (click)="limit.set(limit() + 100)">Show more permissions</button></div>
      }
      <footer>{{ 'Only selected, active permissions are assigned. Group permissions are inherited by its members.' | translate }}</footer>
    </section>`,
  styleUrl: './permission-picker.css',
})
export class PermissionPicker {
  rows = input<Row[]>([]);
  selected = model<Set<number>>(new Set());
  locked = input<Set<number>>(new Set());
  disabled = input(false);
  query = model('');
  active = computed(() => this.rows().filter(row => row['is_active'] === true && Number.isSafeInteger(this.id(row)) && this.id(row) > 0));
  matching = computed(() => this.active().filter(row => `${row['func_name']} ${row['func_code']} ${row['module']}`.toLowerCase().includes(this.query().trim().toLowerCase())));
  limit = model(100);
  visible = computed(() => this.matching().slice(0, this.limit()));
  modules = computed(() => [...new Set(this.visible().map(row => this.module(row)))].sort());
  id(row: Row) { return Number(row['func_id']); }
  module(row: Row) { return String(row['module'] || 'OTHER'); }
  moduleRows(module: string) { return this.visible().filter(row => this.module(row) === module); }
  moduleSelected(module: string) { return this.matching().filter(row => this.module(row) === module).every(row => this.selected().has(this.id(row))); }
  toggle(id: number) {
    if (this.disabled() || this.locked().has(id)) return;
    const next = new Set(this.selected());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selected.set(next);
  }
  toggleModule(module: string) {
    if (this.disabled()) return;
    const remove = this.moduleSelected(module), next = new Set(this.selected());
    for (const row of this.matching().filter(row => this.module(row) === module)) {
      const id = this.id(row);
      if (!this.locked().has(id)) remove ? next.delete(id) : next.add(id);
    }
    this.selected.set(next);
  }
  selectVisible() {
    if (!this.disabled()) this.selected.set(new Set([...this.selected(), ...this.matching().map(row => this.id(row))]));
  }
  clear() { if (!this.disabled()) this.selected.set(new Set(this.locked())); }
}
