import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageService, LANGUAGE_STORAGE_KEY } from './language.service';
import { LanguageSelect } from './language-select';
import { TranslatePipe } from './translate.pipe';
import { Component } from '@angular/core';

@Component({ imports: [TranslatePipe, LanguageSelect], template: `<app-language-select /><h1>{{ 'Products' | translate }}</h1>` })
class TestPage {}

describe('English and Khmer language selection', () => {
  beforeEach(() => { localStorage.removeItem(LANGUAGE_STORAGE_KEY); document.documentElement.lang = 'en'; });
  afterEach(() => { TestBed.resetTestingModule(); localStorage.removeItem(LANGUAGE_STORAGE_KEY); document.documentElement.lang = 'en'; vi.restoreAllMocks(); });

  it('starts in English and safely falls back for unsupported preferences', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'unsupported');
    const service = TestBed.inject(LanguageService);
    expect(service.language()).toBe('en');
    expect(service.translate('Products')).toBe('Products');
  });

  it('restores Khmer, sets the page language, and preserves unknown content', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'km');
    const service = TestBed.inject(LanguageService);
    expect(service.language()).toBe('km');
    expect(document.documentElement.lang).toBe('km');
    expect(service.translate('Products')).toBe('ផលិតផល');
    expect(service.translate('Email *')).toBe('អ៊ីមែល *');
    expect(service.translate('Customer supplied product name')).toBe('Customer supplied product name');
    expect(service.translate(null)).toBe('');
  });

  it('switches visible labels immediately and persists the selection', async () => {
    const fixture = TestBed.createComponent(TestPage);
    await fixture.whenStable();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(Array.from(select.options, option => [option.value, option.textContent?.trim()]))
      .toEqual([['en', 'English'], ['km', 'ខ្មែរ']]);
    expect(select.getAttribute('translate')).toBe('no');
    expect(select.closest('label')?.getAttribute('translate')).toBe('no');
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Products');
    select.value = 'km'; select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('ផលិតផល');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('km');
    select.value = 'en'; select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Products');
    expect(document.documentElement.lang).toBe('en');
  });

  it('synchronizes changes from another tab', () => {
    const service = TestBed.inject(LanguageService);
    window.dispatchEvent(new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY, newValue: 'km' }));
    expect(service.language()).toBe('km');
    expect(document.documentElement.lang).toBe('km');
  });

  it('still switches when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const service = TestBed.inject(LanguageService);
    expect(() => service.setLanguage('km')).not.toThrow();
    expect(service.translate('Save')).toBe('រក្សាទុក');
  });
});
