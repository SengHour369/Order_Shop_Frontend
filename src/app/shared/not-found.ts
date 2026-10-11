import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
@Component({
  imports: [RouterLink],
  template:
    '<section class="empty"><span class="eyebrow">404</span><h1>A little off track.</h1><p>This page could not be found.</p><a class="button primary" routerLink="/shop">Back to the shop</a></section>',
})
export class NotFound {}
