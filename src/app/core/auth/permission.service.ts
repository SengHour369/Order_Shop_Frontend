import { Injectable, inject, signal } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { catchError, map, of, shareReplay, tap } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { AuthService } from './auth.service';

export interface AccessSnapshot { userId: number; administrator: boolean; permissions: string[]; }
export function isImportRoute(url:string) { return /^\/admin\/(imports|import-approvals|import-executions)(?:[?#]|$)/.test(url); }
export function isStaffWorkflowRoute(url:string){return isImportRoute(url)||/^\/admin\/branches(?:[?#]|$)/.test(url);}
// Codes are defined by the auth service. Unmapped areas retain their existing role guards.
const policies: Record<string, string[]> = {
  products: ['PRODUCT_VIEW'], categories: ['CATEGORY_VIEW'], brands: ['SUBCATEGORY_VIEW'],
  orders: ['ORDER_VIEW_ALL'], cancellations: ['CANCELATION_VIEW'], returns: ['RETURN_VIEW'],
  payments: ['PAYMENT_VIEW_ALL'], refunds: ['REFUND_VIEW'], transactions: ['PAYMENT_TXN_VIEW'],
  customers: ['USER_MANAGE'], users: ['USER_MANAGE'], groups: ['USER_GROUP_VIEW'],
  'customer-groups': ['USER_GROUP_VIEW'], bakong: ['BAKONG_QR'],
  inventory: ['INVENTORY_VIEW'], 'sales-report': ['REPORT_VIEW'],
  'payment-report': ['REPORT_VIEW'], 'tax-report': ['REPORT_VIEW'], promotions: ['PROMOTION_VIEW'], activity: ['AUDIT_VIEW'],
  imports: ['IMPORT_UPLOAD'], 'import-approvals': ['IMPORT_REVIEW'], branches:['BRANCH_VIEW'],
};
export function requiredPermissions(url: string): string[] {
  const parts = url.split('?')[0].split('/').filter(Boolean);
  const section = parts[1] || '';
  const action = parts[2];
  if (section === 'products' && action === 'add') return ['PRODUCT_CREATE'];
  if (section === 'products' && action === 'edit') return ['PRODUCT_UPDATE'];
  if (['groups', 'customer-groups'].includes(section) && action === 'add') return ['USER_GROUP_CREATE', 'GRP_PERM_CREATE', 'FUNC_VIEW'];
  if (section === 'customer-groups' && action === 'edit') return ['USER_GROUP_UPDATE'];
  if (section === 'customers' && action === 'add') return ['USER_MANAGE', 'FUNC_VIEW', 'USER_GROUP_VIEW'];
  return policies[section] || [];
}

@Injectable({providedIn: 'root'})
export class PermissionService {
  private api = inject(ApiClient);
  private auth = inject(AuthService);
  private snapshot = signal<{token: string; value: AccessSnapshot} | null>(null);
  private pending?: {token: string; request: ReturnType<PermissionService['fetch']>};
  private generation = 0;
  private fetch(token: string) {
    const generation = ++this.generation;
    return this.api.get<AccessSnapshot>('/api/v1/user/access').pipe(tap(value => {
      if (generation === this.generation && this.auth.session()?.access_token === token && value.userId === this.auth.session()?.id && Array.isArray(value.permissions)) {
        this.snapshot.set({token, value});
      }
    }), map(() => this.snapshot()?.token === token), catchError(() => of(false)), shareReplay({bufferSize:1,refCount:true}));
  }
  load(force = false) {
    const token = this.auth.session()?.access_token;
    if (!token) { this.snapshot.set(null); return of(false); }
    if (!force && this.snapshot()?.token === token) return of(true);
    if (!force && this.pending?.token === token) return this.pending.request;
    this.snapshot.set(null);
    const request = this.fetch(token);
    this.pending = {token, request};
    // Do not retain a failed response: the next navigation can retry.
    return request.pipe(tap(() => { if (this.pending?.request === request) this.pending = undefined; }));
  }
  has(code: string) {
    const snapshot = this.snapshot();
    return !!snapshot && snapshot.token === this.auth.session()?.access_token && snapshot.value.permissions.includes(code);
  }
  isAdministrator(){const s=this.snapshot();return !!s&&s.token===this.auth.session()?.access_token&&s.value.administrator;}
  allows(url: string) {
    if (url.split(/[?#]/)[0] === '/admin/import-executions') return this.has('IMPORT_UPLOAD') || this.has('IMPORT_REVIEW');
    return requiredPermissions(url).every(code => this.has(code));
  }
}

export const permissionGuard: CanActivateChildFn = (_route, state) => {
  const access = inject(PermissionService), router = inject(Router),auth=inject(AuthService);
  if (state.url.startsWith('/admin/access-denied')) return true;
  if (!['ADMIN','MANAGER'].includes(auth.session()?.role||'') && !isStaffWorkflowRoute(state.url)) return router.createUrlTree(['/admin/access-denied']);
  return access.load(true).pipe(map(loaded => loaded && access.allows(state.url) || router.createUrlTree(['/admin/access-denied'])));
};
