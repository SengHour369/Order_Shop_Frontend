import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Icon } from "./icon";
@Component({
  selector: "app-sign-in-card",
  imports: [RouterLink, Icon],
  template: `<div class="sign-in-prompt">
    <span class="icon-circle"><app-icon name="lock" /></span>
    <div>
      <h3>Your account, all in one place</h3>
      <p>Sign in to {{ action() }}.</p>
    </div>
    <a
      class="button primary"
      routerLink="/auth"
      [queryParams]="{ returnUrl: path() }"
      >Sign In <app-icon name="arrow"
    /></a>
  </div>`,
})
export class SignInCard {
  action = input("view your personal information");
  path = input("/account");
}
