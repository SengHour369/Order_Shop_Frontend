import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({imports:[RouterLink],template:`<section class="adm-panel" style="max-width:640px;margin:48px auto;padding:40px;text-align:center"><h2>Access unavailable</h2><p>Your account does not have permission to open this page, or permissions could not be loaded. Ask an administrator to review your groups and permissions.</p><a class="adm-btn adm-primary" routerLink="/admin">Return to dashboard</a></section>`})
export class AccessDeniedPage {}
