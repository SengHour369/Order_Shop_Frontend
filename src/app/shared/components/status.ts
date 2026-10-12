import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, input } from "@angular/core";
@Component({imports: [TranslatePipe],
  selector: "app-status",
  template: `@if (busy()) {
      <p role="status" class="muted">{{ "Loading…" | translate }}</p>
    }
    @if (error()) {
      <p role="alert" class="alert">{{ error() }}</p>
    }
    @if (message()) {
      <p role="status" class="success">{{ message() }}</p>
    }`,
})
export class Status {
  busy = input(false);
  error = input("");
  message = input("");
}
