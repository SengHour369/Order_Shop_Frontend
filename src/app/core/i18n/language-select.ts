import { Component, inject } from '@angular/core';
import { LanguageService } from './language.service';

@Component({
  selector: 'app-language-select',
  standalone: true,
  template: `<label class="language-select notranslate" translate="no"><span aria-hidden="true">◎</span>
    <select class="notranslate" translate="no" aria-label="Language / ភាសា" [value]="language.language()"
      (change)="language.setLanguage($any($event.target).value)">
      <option value="en" lang="en" translate="no">English</option>
      <option value="km" lang="km" translate="no">ខ្មែរ</option>
    </select>
  </label>`,
  styles: [`:host{display:inline-flex;flex-shrink:0}.language-select{display:flex;align-items:center;gap:5px;border:1px solid #dce3ed;border-radius:8px;padding:0 8px;background:#fff;color:#334155;min-height:36px}.language-select select{font-family:var(--app-font);font-size:13px;color:inherit;background:transparent;border:0;min-height:34px;max-width:100px;padding:4px;cursor:pointer}.language-select:focus-within{outline:2px solid #00834a;outline-offset:2px}@media(max-width:480px){.language-select{padding:0 4px;gap:0}.language-select>span{display:none}.language-select select{max-width:82px}}`],
})
export class LanguageSelect {
  readonly language = inject(LanguageService);
}
