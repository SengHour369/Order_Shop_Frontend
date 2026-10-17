import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CustomersPage } from './customers.page';
import { AdminApi } from '../api/admin.api';
import { PermissionService } from '../../../core/auth/permission.service';
describe('Customers list',()=>{
 function setup(){TestBed.configureTestingModule({providers:[{provide:ActivatedRoute,useValue:{queryParamMap:of(convertToParamMap({}))}},{provide:PermissionService,useValue:{has:()=>true}},{provide:AdminApi,useValue:{customers:()=>of({items:[{id:1,full_name:'Jane Smith',email:'jane@test.com',status:'ACT',groups:['VIP']},{id:2,full_name:'John Doe',status:'BLK',groups:['Default']}]})}}]});return TestBed.runInInjectionContext(()=>new CustomersPage());}
 it('searches full names and combines group and status filters',()=>{const p=setup();p.query.set('jane smith');p.groupFilter.set('VIP');p.statusFilter.set('active');expect(p.visible()).toHaveLength(1);p.statusFilter.set('inactive');expect(p.visible()).toHaveLength(0);});
 it('selects only the current page and maintains unavailable totals',()=>{const p=setup();p.size=1;p.toggleAll();expect(p.checked.has(1)).toBe(true);expect(p.checked.has(2)).toBe(false);expect(p.totalSpent()).toBe('—');p.goto(2);expect(p.allSelected()).toBe(false);});
});
