import { TestBed } from '@angular/core/testing';
import { LauncherWelcome } from './launcher-welcome';

describe('Local customer launcher welcome', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  function create(x=600,y=400) {
    const fixture=TestBed.createComponent(LauncherWelcome);
    fixture.componentRef.setInput('position',{x,y,width:58,height:58});
    fixture.detectChanges();
    return fixture;
  }

  it('starts its fade at exactly two seconds and keeps the hint local', () => {
    const fixture=create();
    expect(fixture.nativeElement.textContent).toContain('Is there anything I can do to help you?');
    vi.advanceTimersByTime(1999);
    expect(fixture.componentInstance.visible()).toBe(true);
    vi.advanceTimersByTime(1);fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('fading')).toBe(true);
    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the bubble inside each viewport corner', () => {
    const fixture=create();
    for (const [x,y] of [[8,8],[8,700],[10000,8],[10000,10000]]) {
      fixture.componentRef.setInput('position',{x,y,width:58,height:58});fixture.detectChanges();
      const position=fixture.componentInstance.coordinates();
      expect(position.x).toBeGreaterThanOrEqual(8);expect(position.y).toBeGreaterThanOrEqual(8);
      expect(position.x+250).toBeLessThanOrEqual(window.innerWidth-8);
      expect(position.y+78).toBeLessThanOrEqual(window.innerHeight-8);
    }
  });

  it('dismisses permanently when chat opens and cleans up its timer', () => {
    const fixture=create();fixture.componentRef.setInput('dismissed',true);fixture.detectChanges();
    expect(fixture.componentInstance.visible()).toBe(false);
    fixture.componentRef.setInput('dismissed',false);fixture.detectChanges();
    expect(fixture.componentInstance.visible()).toBe(false);
    fixture.destroy();expect(vi.getTimerCount()).toBe(0);
  });
});
