import { afterNextRender, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal } from '@angular/core';

/** A local launcher hint only; it has no chat, authentication or API dependencies. */
@Component({
  selector: 'app-launcher-welcome',
  template: 'Is there anything I can do to help you?',
  host: {
    role: 'status',
    '[class.fading]': '!visible()',
    '[attr.aria-hidden]': '!visible()',
    '[style.left.px]': 'coordinates().x',
    '[style.top.px]': 'coordinates().y',
  },
  styles: [`
    :host { position:fixed; z-index:81; box-sizing:border-box; width:min(250px,calc(100vw - 24px));
      max-height:calc(100dvh - 16px); overflow:auto; padding:13px 16px; border-radius:16px;
      background:#fff; color:#0b1339; border:1px solid #cdebdc; box-shadow:0 8px 28px #006e4520;
      font:inherit; font-size:13px; line-height:1.5; pointer-events:none; opacity:1;
      transition:opacity 180ms ease,transform 180ms ease; }
    :host(.fading) { opacity:0; transform:translateY(4px); visibility:hidden;
      transition:opacity 180ms ease,transform 180ms ease,visibility 0s 180ms; }
    @media(prefers-reduced-motion:reduce) { :host,:host(.fading) { transition:none; } }
  `],
})
export class LauncherWelcome {
  readonly position = input.required<{x:number;y:number;width:number;height:number}>();
  readonly dismissed = input(false);
  readonly visible = signal(true);
  private readonly size = signal({width:250,height:78});
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly destroy = inject(DestroyRef);

  readonly coordinates = computed(() => {
    const icon = this.position(), size = this.size(), viewport = window.visualViewport;
    const left = (viewport?.offsetLeft ?? 0) + 8, top = (viewport?.offsetTop ?? 0) + 8;
    const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
    // Prefer beside the icon; use above/below on narrower screens.
    let x = icon.x - size.width - 12;
    let y = icon.y + (icon.height - size.height) / 2;
    if (x < left) {
      x = icon.x + icon.width + 12;
      if (x + size.width > left + width - 16) {
        x = icon.x + (icon.width - size.width) / 2;
        y = icon.y - size.height - 12;
        if (y < top) y = icon.y + icon.height + 12;
      }
    }
    return {
      x:Math.max(left,Math.min(x,left + width - 16 - size.width)),
      y:Math.max(top,Math.min(y,top + height - 16 - size.height)),
    };
  });

  constructor() {
    const timer = setTimeout(() => this.visible.set(false), 2000);
    this.destroy.onDestroy(() => clearTimeout(timer));
    effect(() => { if (this.dismissed()) this.visible.set(false); });
    afterNextRender(() => {
      const element = this.element.nativeElement;
      const measure = () => {
        const rect = element.getBoundingClientRect();
        if (rect.width && rect.height) this.size.set({width:rect.width,height:rect.height});
      };
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        this.destroy.onDestroy(() => observer.disconnect());
      }
    });
  }
}
