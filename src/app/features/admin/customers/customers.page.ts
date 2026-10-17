import { DatePipe } from "@angular/common";
import { PermissionService } from "../../../core/auth/permission.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subscription } from "rxjs";
import { Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text, tone, usd, when } from "../api/admin.api";
@Component({
  imports: [DatePipe, Status, RouterLink, FormsModule, Icon],
  templateUrl: "./customers-reference.html",
  styleUrls: ["./groups.css", "./customers-list.css"],
})
export class CustomersPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  page = 1;
  rows = signal<Row[]>([]);
  query = signal("");
  access=inject(PermissionService);
  size=10;statusFilter=signal('');groupFilter=signal('');joinDate=signal('');filtersOpen=false;checked=new Set<number>();menuId=0;
  groupNames=computed(()=>[...new Set(this.rows().flatMap(row=>this.groupsOf(row)))].sort());
  visible=computed(()=>this.rows().filter(row=>{
    const q=this.query().trim().toLowerCase();
    return (!q||`${field(row,'fullName','full_name','name')} ${field(row,'username')} ${field(row,'email')} ${field(row,'phone')}`.toLowerCase().includes(q))&&(!this.statusFilter()||(this.statusFilter()==='active')===this.active(row))&&(!this.groupFilter()||this.groupsOf(row).includes(this.groupFilter()))&&(!this.joinDate()||String(field(row,'created','created_at','createdAt')).slice(0,10)===this.joinDate());
  }));
  groupsOf(row:Row):string[]{const value=field(row,'groups','groupNames','group_names');if(Array.isArray(value))return value.map(g=>typeof g==='string'?g:String(field(g as Row,'name','group_name'))).filter(Boolean);const name=field(row,'group_name','groupName');return name?[String(name)]:[];}
  pages(){return Math.max(1,Math.ceil(this.visible().length/this.size));}
  pageNumbers(){const start=Math.max(1,Math.min(this.page-2,this.pages()-4));return Array.from({length:Math.min(5,this.pages())},(_,i)=>start+i);}
  goto(page:number){if(page>=1&&page<=this.pages())this.page=page;}
  toggle(id:number){this.checked.has(id)?this.checked.delete(id):this.checked.add(id);}
  allSelected(){const rows=this.visible().slice((this.page-1)*this.size,this.page*this.size);return !!rows.length&&rows.every(r=>this.checked.has(Number(r['id'])));}
  toggleAll(){const all=this.allSelected();for(const row of this.visible().slice((this.page-1)*this.size,this.page*this.size)){all?this.checked.delete(Number(row['id'])):this.checked.add(Number(row['id']));}}
  metric(row:Row,...keys:string[]){const value=field(row,...keys);return value===''||value===null||value===undefined?'—':String(value);}
  money(row:Row){const value=field(row,'total_spent','totalSpent');return value===''||value===null||value===undefined?'—':usd(value);}
  date(row:Row){const value=String(field(row,'created','created_at','createdAt'));return Number.isFinite(Date.parse(value))?value:null;}
  newCount(){return this.rows().filter(row=>{const date=this.date(row);return date&&Date.now()-Date.parse(date)<=30*86400000;}).length;}
  totalMetric(...keys:string[]){const values=this.rows().map(row=>field(row,...keys));return !values.length||values.some(v=>v===''||v===null||v===undefined||!Number.isFinite(Number(v)))?'—':values.reduce<number>((sum,v)=>sum+Number(v),0);}
  totalSpent(){const value=this.totalMetric('total_spent','totalSpent');return value==='—'?value:usd(value);}
  setStatus(row:Row){if(this.busy()||!this.access.has('USER_MANAGE')||!confirm(this.active(row)?'Block this customer?':'Activate this customer?'))return;this.run(this.api.customerStatus(Number(row['id']),this.active(row)?'BLK':'ACT'),()=>{this.menuId=0;this.load();});}
  totalCount = computed(() => this.rows().length);
  activeCount = computed(
    () => this.rows().filter((row) => this.active(row)).length,
  );
  blockedCount = computed(
    () => this.rows().filter((row) => this.blocked(row)).length,
  );
  field = field;
  text = text;
  constructor() {
    super();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) =>
      this.query.set(params.get("q") || ""),
    );
    this.load();
  }
  load() {
    this.run(this.api.customers(), (result) => {
      this.rows.set(result.items);this.page=Math.min(this.page,this.pages());
    }, true);
  }
  initial(row: Row) {
    const value = String(field(row, "username") || "?").trim();
    return (value || "?").slice(0, 1).toUpperCase();
  }
  active(row: Row) {
    const status = String(field(row, "status") ?? "").toUpperCase();
    return status === "ACT" || tone(field(row, "status")) === "on";
  }
  blocked(row: Row) {
    const status = String(field(row, "status") ?? "").toUpperCase();
    return status === "BLK" || tone(field(row, "status")) === "off";
  }

}
@Component({
  imports: [TranslatePipe, Status, RouterLink, Icon],
  templateUrl: "./customer-detail.html",
  styleUrl: "../styles/details.css",
})
export class CustomerDetailPage extends PageState {
  private historyDestroyRef = inject(DestroyRef);
  private historyRequest?: Subscription;
  orders = signal<Row[]>([]);
  ordersError = signal('');
  ordersBusy = signal(false);
  orderPage = 1;
  orderPages = signal(1);
  orderTotal = signal<number | null>(null);
  usd = usd;
  customerName(row: Row) { return text(field(row, 'fullName', 'full_name', 'name', 'username')); }
  loadOrders(id: number, page = 1) {
    this.ordersBusy.set(true);
    this.ordersError.set('');
    this.historyRequest?.unsubscribe();
    this.historyRequest = this.api.customerOrders(id, page).pipe(takeUntilDestroyed(this.historyDestroyRef)).subscribe({
      next: result => {
        this.orders.set(result.items);
        this.orderPage = page;
        this.orderPages.set(result.pages);
        this.orderTotal.set(result.total);
        this.ordersBusy.set(false);
      },
      error: () => { this.orders.set([]); this.orderTotal.set(null); this.ordersBusy.set(false); this.ordersError.set('Could not load order history.'); }
    });
  }

  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  row = signal<Row | null>(null);
  field = field;
  text = text;
  when = when;
  tone = tone;
  constructor() {
    super();
    this.route.paramMap.subscribe((params) =>
      this.load(Number(params.get("id"))),
    );
  }
  load(id: number, done?: string) {
    this.historyRequest?.unsubscribe();
    this.row.set(null);
    this.orders.set([]);
    this.orderTotal.set(null);
    this.run(this.api.customer(id), (row) => {
      this.row.set(row);
      this.loadOrders(id);
      if (done) this.message.set(done);
    }, true);
  }
  setStatus(status: string) {
    if (
      status === "BLK" &&
      !confirm("Block this account? They will not be able to sign in.")
    )
      return;
    const id = Number(field(this.row() || {}, "id"));
    this.run(this.api.customerStatus(id, status), () => {
      this.load(
        id,
        status === "ACT" ? "Account is active." : "Account is blocked.",
      );
    });
  }
}
