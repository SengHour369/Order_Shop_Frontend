import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionService } from './permission.service';

/** Remove restricted controls from the DOM; role names never imply action grants. */
@Directive({ selector: '[appCan], [appCanAny], [appCanRoute]' })
export class CanAccessDirective {
  readonly appCan = input<string | readonly string[] | null>(null);
  readonly appCanAny = input<readonly string[] | null>(null);
  readonly appCanRoute = input<string | readonly unknown[] | null | undefined>(undefined);
  private access = inject(PermissionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private template = inject(TemplateRef<unknown>);
  private container = inject(ViewContainerRef);
  private rendered = false;
  constructor() {
    effect(() => {
      const codes = this.appCan();
      const link = this.appCanRoute();
      const any = this.appCanAny();
      let allowed = codes !== null && (typeof codes === 'string' ? [codes] : codes).every(code => this.access.has(code));
      if (any !== null) allowed = any.some(code => this.access.has(code));
      if (link === null) allowed = true;
      if (link !== null && link !== undefined) {
        const url = this.router.serializeUrl(this.router.createUrlTree(
          typeof link === 'string' ? [link] : [...link], { relativeTo: this.route },
        ));
        allowed = !url.startsWith('/admin') || this.access.allows(url);
      }
      if (allowed === this.rendered) return;
      this.container.clear();
      if (allowed) this.container.createEmbeddedView(this.template);
      this.rendered = allowed;
    });
  }
}
