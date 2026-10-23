import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { concatMap, forkJoin, from, of, switchMap, tap, toArray } from 'rxjs';
import { PageState } from '../../../shared/utils/page-state';
import { Icon } from '../../../shared/components/icon';
import { Status } from '../../../shared/components/status';
import { PermissionService } from '../../../core/auth/permission.service';
import { AdminApi, field, Row, text, when, usd } from '../api/admin.api';
@Component({ imports: [PageAccessDenied, CanAccessDirective, FormsModule, RouterLink, Icon, Status, NgTemplateOutlet], templateUrl: './customer-group.html', styleUrl: './customer-group.css' })
export class CustomerGroupPage extends PageState {
  access = inject(PermissionService);
  private api = inject(AdminApi); private route = inject(ActivatedRoute); private router = inject(Router);
  group = signal<Row | null>(null); functions = signal<Row[]>([]); chosen = signal(new Set<number>());
  assignments = new Map<number, number>(); createdId = 0; id = 0; detail = false;
  accessGroup = this.router.url.startsWith('/admin/groups');
  listRoute = this.accessGroup ? '/admin/groups' : '/admin/customer-groups';
  name = ''; code = ''; description = ''; type = this.accessGroup ? 'STAFF' : 'CUSTOMER'; active = true;
  query = signal(''); pickerOpen = signal(true);
  types = ['STAFF', 'CUSTOMER', 'VIP', 'Loyalty', 'Wholesale', 'Default', 'Behavioral', 'Segment', 'Corporate'];
  field = field; text = text; when = when;
  available = computed(() => this.functions().filter(row => row['is_active'] === true && Number(row['func_id']) > 0));
  matching = computed(() => this.available().filter(row => `${row['func_name']} ${row['func_code']} ${row['module']}`.toLowerCase().includes(this.query().toLowerCase())));
  selected = computed(() => this.functions().filter(row => this.chosen().has(Number(row['func_id']))));
  constructor() {
    super(); this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.id = Number(params.get('id') || 0); this.detail = this.id > 0 && !this.router.url.includes('/edit/'); this.load();
    });
  }
  load() {
    this.group.set(null); this.createdId = 0; this.assignments.clear(); this.chosen.set(new Set());
    this.run(forkJoin({ group: this.id ? this.api.group(this.id) : of(null), functions: this.access.has('FUNC_VIEW') ? this.api.allPermissionRows('functions') : of([] as Row[]), permissions: this.id && this.access.has('GRP_PERM_VIEW') ? this.api.allPermissionRows('group-permissions', 1, String(this.id)) : of([] as Row[]) }), result => {
      this.group.set(result.group); this.functions.set(result.functions);
      for (const row of result.permissions) if (row['is_active'] === true) this.assignments.set(Number(row['func_id']), Number(row['group_permission_id']));
      this.chosen.set(new Set(this.assignments.keys()));
      if (result.group) {
        const row = result.group; this.name = String(field(row, 'group_name', 'name')); this.code = String(field(row, 'group_code'));
        this.description = String(field(row, 'description')); this.type = String(field(row, 'type') || 'CUSTOMER'); this.active = field(row, 'is_active') === true;
        if (!this.types.includes(this.type)) this.types = [this.type, ...this.types];
      }
    }, true);
  }
  permissionId(row: Row) { return Number(row['func_id']); }
  toggle(id: number) { if (this.detail || this.busy()) return; const next = new Set(this.chosen()); next.has(id) ? next.delete(id) : next.add(id); this.chosen.set(next); }
  module(row: Row) { return String(field(row, 'module') || 'General').replaceAll('_', ' '); }
  icon() { return this.type.toUpperCase() === 'VIP' ? 'crown' : 'user'; }
  stats() {
    const row = this.group() || {}; const money = (value: unknown) => value === '' ? '—' : usd(value);
    return [ { label: 'Total Customers', value: text(field(row, 'total_customers', 'totalCustomers')), icon: 'user', color: 'green' }, { label: 'Total Orders', value: text(field(row, 'total_orders', 'totalOrders')), icon: 'cart', color: 'blue' }, { label: 'Total Spent', value: money(field(row, 'total_spent', 'totalSpent')), icon: 'wallet', color: 'purple' }, { label: 'Average Order Value', value: money(field(row, 'average_order_value', 'averageOrderValue')), icon: 'card', color: 'red' } ];
  }
  information() {
    const row = this.group() || {};
    return [['Group Name', this.name], ['Group Code', this.code], ['Group Type', this.type], ['Description', this.description || '—'], ['Status', this.active ? 'Active' : 'Inactive'], ['Created At', when(field(row, 'created_at', 'createdAt'))], ['Created By', text(field(row, 'created_by', 'createdBy'))], ['Last Updated', when(field(row, 'updated_at', 'updatedAt'))], ['Updated By', text(field(row, 'updated_by', 'updatedBy'))]];
  }
  save() {
    if (this.busy() || !this.access.has(this.id ? 'USER_GROUP_UPDATE' : 'USER_GROUP_CREATE') || !this.access.has('GRP_PERM_CREATE')) return;
    if (!this.name.trim() || !/^[A-Z0-9_-]{1,10}$/.test(this.code) || !this.description.trim() || this.description.length > 500) { this.error.set('Enter a name, a valid code, and a description of up to 500 characters.'); return; }
    if ([...this.assignments.keys()].some(id => !this.chosen().has(id)) && !this.access.has('GRP_PERM_DELETE')) { this.error.set('You do not have permission to remove group permissions.'); return; }
    const body = { group_name: this.name.trim(), group_code: this.code, description: this.description.trim(), type: this.type, is_active: this.active, status: this.active ? 'ACT' : 'BLK' };
    const groupId = this.id || this.createdId;
    this.run(this.api.saveGroup(body, groupId || undefined).pipe(tap(row => { this.createdId = Number(field(row, 'group_id', 'id')) || groupId; if (!this.createdId) throw new Error('The service did not return a group ID.'); this.group.set(row); }), switchMap(() => {
      const remove = [...this.assignments.entries()].filter(([id]) => !this.chosen().has(id));
      const add = [...this.chosen()].filter(id => !this.assignments.has(id));
      return from([
        ...remove.map(([id, assignment]) => () => this.api.deletePermissionRow('group-permissions', assignment).pipe(tap(() => this.assignments.delete(id)))),
        ...add.map(id => () => this.api.createPermissionRow('group-permissions', { groupId: this.createdId, funcId: id }).pipe(tap(row => { this.assignments.set(id, Number(field(row, 'group_permission_id', 'id'))); }))),
      ]).pipe(concatMap(operation => operation()), toArray());
    })), () => { void this.router.navigate(this.accessGroup ? [this.listRoute] : [this.listRoute, this.createdId]); });
  }
  remove() {
    if (this.busy() || !this.id || !this.access.has('USER_GROUP_DELETE') || !confirm(`Delete the group “${this.name}”?`)) return;
    this.run(this.api.deleteGroup(this.id), () => { void this.router.navigate([this.listRoute]); });
  }
}
