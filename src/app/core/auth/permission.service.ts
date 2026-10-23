import { Injectable, inject, signal } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { catchError, map, of, shareReplay, tap } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { AuthService } from './auth.service';

export interface AccessSnapshot { userId: number; administrator: boolean; permissions: string[]; }
export function isImportRoute(url:string) { return /^\/admin\/(imports|import-approvals|import-executions|my-requests|review-authorization)(?:[?#]|$)/.test(url); }
export function isStaffWorkflowRoute(url:string){return isImportRoute(url)||/^\/admin\/branches(?:[?#]|$)/.test(url);}
// Navigation and route guards share these function codes from the auth service.
const policies: Record<string, string[]> = {
  settings: ['USER_MANAGE'],
  'live-tests': ['SYSTEM_TEST_VIEW'],
  'storefront-access': ['STOREFRONT_ACCESS_VIEW'], 'guest-reviews': ['PRODUCT_REVIEW_MODERATE'], 'guest-activity': ['AUDIT_VIEW'],
  products: ['PRODUCT_VIEW'], categories: ['CATEGORY_VIEW'], brands: ['SUBCATEGORY_VIEW'],
  orders: ['ORDER_VIEW_ALL'], cancellations: ['CANCELATION_VIEW'], returns: ['RETURN_VIEW'],
  payments: ['PAYMENT_VIEW_ALL'], refunds: ['REFUND_VIEW'], transactions: ['PAYMENT_TXN_VIEW'],
  customers: ['USER_MANAGE'], users: ['USER_MANAGE'], groups: ['USER_GROUP_VIEW'],
  'customer-groups': ['USER_GROUP_VIEW'], bakong: ['BAKONG_QR'],
  inventory: ['INVENTORY_VIEW'], 'sales-report': ['REPORT_VIEW'],
  'payment-report': ['REPORT_VIEW'], 'tax-report': ['REPORT_VIEW'], promotions: ['PROMOTION_VIEW'], activity: ['AUDIT_VIEW'],
  branches:['BRANCH_VIEW'],
  'my-requests':['IMPORT_UPLOAD'], 'review-authorization':['IMPORT_REVIEW'],
};
export function requiredPermissions(url: string): string[] {
  const parts = url.split(/[?#]/)[0].split('/').filter(Boolean);
  const section = parts[1] || '';
  const action = parts[2];
  if (section === 'categories' && ['add', 'edit'].includes(action)) return ['CATEGORY_CREATE'];
  if (section === 'brands' && ['add', 'edit'].includes(action)) return ['SUBCATEGORY_CREATE'];
  if (section === 'inventory' && ['stock-in', 'stock-out', 'adjustments', 'add', 'edit'].includes(action)) return ['INVENTORY_VIEW', 'INVENTORY_ADJUST'];
  if (section === 'products' && action === 'add') return ['PRODUCT_CREATE','IMPORT_UPLOAD'];
  if (section === 'products' && action === 'edit') return ['PRODUCT_UPDATE','IMPORT_UPLOAD'];
  if (['groups', 'customer-groups'].includes(section) && action === 'add') return ['USER_GROUP_CREATE', 'GRP_PERM_CREATE', 'FUNC_VIEW'];
  if (['groups', 'customer-groups'].includes(section) && action === 'edit') return ['USER_GROUP_UPDATE', 'GRP_PERM_CREATE', 'FUNC_VIEW', 'GRP_PERM_VIEW'];
  if (section === 'promotions' && (action === 'add' || action === 'edit')) return ['PROMOTION_MANAGE'];
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
  private cookieIdentity?: object;
  private cookieRevision = 0;
  private sessionKey() {
    const session = this.auth.session();
    if (session?.token_type !== 'Cookie') return session?.access_token;
    if (this.cookieIdentity !== session) { this.cookieIdentity = session; this.cookieRevision++; }
    return 'cookie:' + session.id + ':' + this.cookieRevision;
  }
  private fetch(token: string) {
    const generation = ++this.generation;
    return this.api.get<AccessSnapshot>('/api/v1/user/access').pipe(tap(value => {
      if (generation === this.generation && this.sessionKey() === token && value.userId === this.auth.session()?.id && Array.isArray(value.permissions)) {
        this.snapshot.set({token, value});
      }
    }), map(() => this.snapshot()?.token === token), catchError(() => of(false)), shareReplay({bufferSize:1,refCount:true}));
  }
  load(force = false) {
    const token = this.sessionKey();
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
    return !!snapshot && snapshot.token === this.sessionKey() && snapshot.value.permissions.includes(code);
  }
  isAdministrator(){const s=this.snapshot();return !!s&&s.token===this.sessionKey()&&s.value.administrator;}
  allows(url: string) {
    const path = url.split(/[?#]/)[0].replace(/\/$/, '');
    if (!this.snapshot() || this.snapshot()?.token !== this.sessionKey()) return false;
    if (path === '/admin/access-denied') return true;
    if (path !== '/admin' && !path.startsWith('/admin/')) return false;
    const section = path.split('/')[2] || '';
    // These routes also use adminGuard; menus must enforce the same entry rule.
    if (['users', 'groups', 'activity', 'promotions', 'automation', 'ai-automation', 'assistant', 'notifications', 'settings'].includes(section)
        && !this.isAdministrator()) return false;
    if (section === 'ai-automation') return this.isAdministrator();
    if (section === '') return this.hasDashboard();
    if (!policies[section] && !['automation', 'ai-automation', 'assistant', 'notifications', 'settings', 'import-executions'].includes(section)) return false;
    if (path === '/admin/import-executions') return this.has('IMPORT_UPLOAD') || this.has('IMPORT_REVIEW');
    return requiredPermissions(url).every(code => this.has(code));
  }
  allowsMenu(url: string) {
    if (!this.allows(url)) return false;
    const path = url.split(/[?#]/)[0].replace(/\/$/, '');
    if (path === '/admin/ai-automation' || path === '/admin/assistant') return this.isAdministrator();
    if (path === '/admin' || path === '/admin/import-executions') return true;
    // A group must have an explicit function for the menu; staff entry alone
    // must not reveal modules which have no configured function policy.
    return requiredPermissions(url).length > 0;
  }
  hasDashboard() {
    return ['ORDER_VIEW_ALL', 'REPORT_VIEW', 'USER_MANAGE', 'INVENTORY_VIEW'].some(code => this.has(code));
  }
  landingPath() {
    return ['/admin', ...Object.keys(policies).map(section => '/admin/' + section)]
      .find(path => this.allows(path)) || '/admin/access-denied';
  }

}

export const permissionGuard: CanActivateChildFn = (_route, state) => {
  const access = inject(PermissionService), router = inject(Router),auth=inject(AuthService);
  if (state.url.startsWith('/admin/access-denied')) return true;
  return access.load(true).pipe(map(loaded => loaded && (access.isAdministrator() || auth.session()?.role === 'MANAGER' || isStaffWorkflowRoute(state.url)) && access.allows(state.url) || router.createUrlTree([state.url.split(/[?#]/)[0] === '/admin' ? access.landingPath() : '/admin/access-denied'])));
};
