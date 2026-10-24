import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, computed, ElementRef, HostListener, inject, input, output, signal } from "@angular/core";
import { Icon } from "../../../shared/components/icon";

export type ProductSelectOption = { value: number; label: string };

@Component({
  selector: "app-product-select",
  imports: [TranslatePipe, Icon],
  template: `
    <button type="button" class="select-trigger" [id]="controlId()" [disabled]="disabled()"
      aria-haspopup="listbox" [attr.aria-expanded]="open()" [attr.aria-labelledby]="labelId()"
      (click)="toggle()" (keydown.ArrowDown)="open.set(true); $event.preventDefault()">
      <span [class.placeholder]="!selected()">{{ selected()?.label || (placeholder() | translate) }}</span>
      <svg class="select-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z" /></svg>
    </button>
    @if (open()) {
      <div class="select-menu" (keydown.Escape)="close(); $event.stopPropagation()">
        <div class="select-search"><app-icon name="search" />
          <input type="search" [placeholder]='"Search..." | translate' [attr.aria-label]="('Search ' + label()) | translate"
            [value]="query()" (input)="query.set($any($event.target).value)" />
        </div>
        <div class="option-count">{{ filtered().length }} {{ (query() ? 'results found' : 'options — scroll to see all') | translate }}</div>
        <div class="select-options" role="listbox" [attr.aria-label]="label()">
          @for (option of filtered(); track option.value) {
            <button type="button" role="option" [attr.aria-selected]="option.value === value()"
              (click)="changed.emit(option.value); close()">{{ option.label }}</button>
          } @empty { <p>{{ "No results found" | translate }}</p> }
        </div>
        @if (!query() && filtered().length > 6) { <div class="scroll-hint">{{ "↕ Scroll or type to search" | translate }}</div> }
      </div>
    }
  `,
  styles: [`
    :host{display:block;position:relative;min-width:0;width:100%;font-size:14px}
    button,input{font:inherit}button{cursor:pointer}.select-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;background:white;border:1px solid var(--admin-border, #e4e9ed);border-radius:8px;padding:8px 12px;color:#0f172a;min-height:38px;line-height:20px}
    .select-trigger:hover{border-color:#60a5fa}.select-trigger:focus-visible{outline:2px solid var(--admin-brand, #00834a);outline-offset:2px}.select-trigger:disabled{opacity:.5;cursor:not-allowed;border-color:var(--admin-border, #e4e9ed)}.placeholder{color:#94a3b8}.select-chevron{width:16px;height:16px;color:#94a3b8;flex:none}
    .select-menu{position:absolute;top:calc(100% + 4px);left:0;width:100%;z-index:40;background:#fff;border:1px solid var(--admin-border, #e4e9ed);border-radius:8px;box-shadow:0 20px 25px -5px #0002;overflow:hidden}
    .select-search{display:flex;align-items:center;gap:8px;background:#f8fafc;padding:10px 12px;border-bottom:1px solid #f1f5f9}.select-search app-icon{width:16px;height:16px;color:#94a3b8;flex:none}.select-search input{min-height:20px;line-height:20px;margin:0;min-width:0;width:100%;border:0;background:transparent;padding:0;outline:none;color:#0f172a}.option-count{font-size:11px;color:#94a3b8;padding:4px 12px;border-bottom:1px solid #f8fafc}.select-options{max-height:288px;overflow-y:auto;overscroll-behavior:contain}.select-options button{display:block;width:100%;text-align:left;background:white;border:0;padding:10px 12px;color:#334155;line-height:20px}.select-options button:hover,.select-options button:focus-visible{background:var(--admin-soft, #edf8f2);color:var(--admin-brand, #00834a)}.select-options button[aria-selected=true]{background:var(--admin-soft, #edf8f2);color:var(--admin-brand, #00834a);font-weight:600;border-left:2px solid var(--admin-brand, #00834a)}.select-options p{text-align:center;padding:16px 12px;margin:0;color:#94a3b8}.scroll-hint{font-size:10px;text-align:center;color:#94a3b8;background:#f8fafc;border-top:1px solid #f1f5f9;padding:6px 12px}
  `],
})
export class ProductSelect {
  options = input<ProductSelectOption[]>([]);
  value = input(0);
  disabled = input(false);
  placeholder = input("Select an option");
  label = input("options");
  labelId = input("");
  controlId = input("");
  changed = output<number>();
  open = signal(false);
  query = signal("");
  selected = computed(() => this.options().find(option => option.value === Number(this.value())));
  filtered = computed(() => this.options().filter(option => option.label.toLowerCase().includes(this.query().toLowerCase())));
  private element = inject(ElementRef);
  toggle() { if (!this.disabled()) { this.open.update(value => !value); this.query.set(""); } }
  close() { this.open.set(false); this.query.set(""); }
  @HostListener("document:mousedown", ["$event"])
  outside(event: MouseEvent) { if (!this.element.nativeElement.contains(event.target)) this.close(); }
}

