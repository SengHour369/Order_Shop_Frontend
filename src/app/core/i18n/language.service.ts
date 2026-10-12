import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { KHMER } from './khmer';

export type Language = 'en' | 'km';
export const LANGUAGE_STORAGE_KEY = 'eshop.language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly selected = signal<Language>('en');
  readonly language = this.selected.asReadonly();

  constructor() {
    const window = this.document.defaultView;
    try { this.apply(window?.localStorage.getItem(LANGUAGE_STORAGE_KEY)); } catch { this.apply('en'); }
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) this.apply(event.newValue);
    };
    window?.addEventListener('storage', sync);
    inject(DestroyRef).onDestroy(() => window?.removeEventListener('storage', sync));
  }

  setLanguage(value: string): void {
    this.apply(value);
    try { this.document.defaultView?.localStorage.setItem(LANGUAGE_STORAGE_KEY, this.language()); } catch { /* Private browsing can disable storage. */ }
  }

  translate(value: unknown): string {
    const text = value == null ? '' : String(value);
    if (this.language() === 'en') return text;
    const key = text.trim().replace(/\s+/g, ' ').toLowerCase();
    if (KHMER[key]) return KHMER[key];
    // Required-field markers and table-heading punctuation stay attached to their labels.
    const match = key.match(/^(.*?)(\s*[*:])$/);
    return match && KHMER[match[1].trim()] ? KHMER[match[1].trim()] + match[2] : text;
  }

  private apply(value: string | null | undefined): void {
    const language: Language = value === 'km' ? 'km' : 'en';
    this.selected.set(language);
    this.document.documentElement.lang = language;
  }
}
