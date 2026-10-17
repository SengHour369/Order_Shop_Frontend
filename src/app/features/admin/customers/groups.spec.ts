import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GroupsPage } from './groups.page';
import { AdminApi } from '../api/admin.api';
import { PermissionService } from '../../../core/auth/permission.service';
describe('Customer groups list',()=>{
 function setup(){TestBed.configureTestingModule({providers:[{provide:AdminApi,useValue:{allGroups:()=>of([{group_id:1,group_name:'VIP Customers',description:'Premium',type:'VIP',is_active:true,created_at:'2026-10-15'},{group_id:2,group_name:'Wholesale',type:'Wholesale',is_active:false,created_at:'2026-09-10'}])}},{provide:PermissionService,useValue:{has:()=>true}}]});return TestBed.runInInjectionContext(()=>new GroupsPage());}
 it('combines filters across all loaded groups and resets pagination',()=>{const p=setup();p.query.set('premium');p.typeFilter.set('VIP');p.statusFilter.set('active');expect(p.filtered()).toHaveLength(1);p.createdAfter.set('2026-10-16');expect(p.filtered()).toHaveLength(0);p.page.set(4);p.change();expect(p.page()).toBe(1);});
 it('shows unavailable metrics rather than fabricated totals',()=>{const p=setup();expect(p.activeCount()).toBe(1);expect(p.totalMetric('total_customers')).toBe('—');expect(p.spent(p.rows()[0])).toBe('—');});
 it('paginates filtered results and rejects out-of-range navigation',()=>{const p=setup();p.size.set(1);expect(p.pages()).toBe(2);p.goto(2);expect(p.visible()[0]['group_id']).toBe(2);p.goto(3);expect(p.page()).toBe(2);});
});
