import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-page-access-denied',
  imports: [RouterLink],
  template: `<section class="adm-panel" role="alert" style="max-width:640px;margin:32px auto;padding:32px;text-align:center"><h2>Access denied</h2><p>You do not have permission to view this page. Ask your administrator to review your group permissions.</p><button class="adm-btn adm-primary" type="button" (click)="retry()">Retry access</button> <a class="adm-btn" routerLink="/admin">Return to an available page</a></section>`,
})
export class PageAccessDenied {
  retry() { window.location.reload(); }
}
