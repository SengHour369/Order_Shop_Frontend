import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { PageState } from '../../../shared/utils/page-state';
import { Status } from '../../../shared/components/status';
import { Icon } from '../../../shared/components/icon';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AdminApi, field, Row, text } from '../api/admin.api';
@Component({
  imports: [RouterLink, Status, Icon, TranslatePipe],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
})
export class UserDetailPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  user = signal<Row | null>(null);
  activity = signal<Row[]>([]);
  activityUnavailable = signal(false);
  more = signal(false);
  expandedPermissions = signal(false);
  showAllActivity = signal(false);
  sessionDialog = viewChild<ElementRef<HTMLDialogElement>>('sessionDialog');
  activityPage = 0; activityPages = signal(0); activityLoading = signal(false);
  private loadTicket = 0;
  id = 0;
  number=Number;
  field = field; text = text;
  constructor() {
    super();
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => this.load(Number(params.get('id'))));
  }
  load(id: number) {
    const ticket=++this.loadTicket;this.activityPage=0;this.activityPages.set(0);this.activityLoading.set(false);
    this.id = id; this.user.set(null); this.activity.set([]); this.activityUnavailable.set(false);
    this.more.set(false); this.expandedPermissions.set(false); this.showAllActivity.set(false);
    this.run(forkJoin({
      user: this.api.userDetails(id),
      activity: this.api.userDetailsActivity(id).pipe(catchError(() => { if(ticket===this.loadTicket)this.activityUnavailable.set(true); return of(null); })),
    }), result => {
      if(ticket!==this.loadTicket)return;
      this.user.set(result.user);
      this.applyActivity(result.activity);

    }, true);
  }
  private applyActivity(result:Row|null) {
    const events=(result?.['items'] as Row[])||[];
    this.activity.set(events.filter(event=>String(field(event,'actorId','actor_id'))===String(this.id) || (field(event,'resourceType')==='USER' && String(field(event,'resourceId'))===String(this.id))));
    this.activityPages.set(Number(result?.['totalPages']||0));
  }
  changeActivityPage(page:number){
    if(this.activityLoading()||page<0||page>=this.activityPages())return;
    const ticket=this.loadTicket;this.activityLoading.set(true);this.activityUnavailable.set(false);
    this.api.userDetailsActivity(this.id,page).pipe(takeUntilDestroyed(this.detailDestroy)).subscribe({
      next:result=>{if(ticket===this.loadTicket){this.activityPage=page;this.applyActivity(result);this.activityLoading.set(false);}},
      error:()=>{if(ticket===this.loadTicket){this.activityUnavailable.set(true);this.activityLoading.set(false);}}
    });
  }
  private detailDestroy=inject(DestroyRef);
  sessions():Row[]{return (this.user()?.['sessions'] as Row[])||[];}
  openSessions(){this.sessionDialog()?.nativeElement.showModal();}
  closeSessions(){this.sessionDialog()?.nativeElement.close();}
  when(value:unknown){
    if(!value)return '—';const date=new Date(String(value));if(Number.isNaN(date.getTime()))return '—';
    return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(date).replace(/(\d{4}), /,'$1 ');
  }
  formattedId(){return 'USR-'+String(this.id).padStart(6,'0');}
  language(){const value=String(field(this.user()||{},'language'));return ({'en-US':'English (US)','km-KH':'ខ្មែរ (Cambodia)'} as Record<string,string>)[value]||value||'Not configured';}
  fullName() { return text(field(this.user() || {}, 'fullName', 'full_name', 'name', 'username')); }
  names() {
    const parts = String(field(this.user() || {}, 'fullName', 'full_name', 'name')).trim().split(/\s+/);
    return { first: parts.shift() || '—', last: parts.join(' ') || '—' };
  }
  initials() { return this.fullName().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
  active() { return field(this.user() || {}, 'status') === 'ACT'; }
  status() { const value = String(field(this.user() || {}, 'status')); return value === 'ACT' ? 'Active' : value === 'BLK' ? 'Blocked' : value || '—'; }
  address() {
    const value = field(this.user() || {}, 'addresses');
    if (!Array.isArray(value) || !value.length) return text(field(this.user() || {}, 'address'));
    const row = (value.find(address => field(address, 'is_default', 'isDefault') === true) || value[0]) as Row;
    return [field(row, 'address_line1'), field(row, 'city'), field(row, 'zip_code'), field(row, 'country')].filter(Boolean).join(', ') || '—';
  }
  groups(): Row[] { const value = field(this.user() || {}, 'groups', 'user_groups'); return Array.isArray(value) ? value.map(item => typeof item === 'string' ? { name: item } : item as Row) : []; }
  roles() { const user = this.user() || {}; const roles = field(user, 'roles'); return Array.isArray(roles) ? roles.map(role => typeof role === 'string' ? role : field(role as Row, 'name', 'role_name')).filter(Boolean).join(', ') : text(field(user, 'role')); }
  permissions(): string[] { const value = field(this.user() || {}, 'permissions'); return Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : String(field(item as Row, 'name', 'func_name', 'authority', 'code'))).filter(Boolean).map(name=>/^[A-Z_]+$/.test(name)?name.toLowerCase().replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase()):name) : []; }
  securityFields() {
    const user = this.user() || {};
    return [
      ['Two-Factor Authentication', user['twoFactorRequired'] === true ? 'Enabled' : 'Disabled'],
      ['Last Password Change', user['passwordChangedAt'] ? this.when(user['passwordChangedAt']) : 'Not recorded'],
      ['Login Attempts', typeof user['loginAttempts'] === 'number' ? `${user['loginAttempts']} failed attempts` : '—'],
      ['Session Active', typeof user['activeSessions'] === 'number' ? `${user['activeSessions']} active ${user['activeSessions']===1?'session':'sessions'}` : '—'],
    ];
  }
  personalFields() {
    const user = this.user() || {};
    return [ ['First Name', this.names().first], ['Last Name', this.names().last], ['Username', text(field(user, 'username'))], ['Email Address', text(field(user, 'email'))], ['Phone Number', text(field(user, 'phone', 'phoneNumber'))], ['Date of Birth', this.birthdate()], ['Gender', String(field(user,'gender')||'—').toLowerCase().replace(/^./,letter=>letter.toUpperCase())], ['Department', text(field(user, 'department'))], ['Job Title', text(field(user, 'job_title', 'jobTitle'))], ['Manager', text(field(user, 'manager'))], ['Address', this.address()] ];
  }
  birthdate(){const value=String(field(this.user()||{},'birthdate'));if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return text(value);return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric'}).format(new Date(value+'T12:00:00'));}
  activitySource(event:Row){return event['ipAddress']?'IP: '+event['ipAddress']:event['actorName']?'by '+event['actorName']:text(field(event,'result'));}
  actionLabel(event: Row) { const action=String(field(event,'action'));const labels:Record<string,string>={LOGIN:'Logged in successfully',LOGIN_FAILED:'Login failed',PASSWORD_CHANGE:'Password changed',PASSWORD_RESET:'Password reset',UPDATE:'Profile updated',ROLE_GRANTED:'Role granted',ROLE_REVOKED:'Role removed'};return labels[action]||String(field(event, 'action') || 'Activity').toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()); }
  activityIcon(event: Row) { const action = String(field(event, 'action')); return action.includes('LOGIN') ? 'lock' : action.includes('PASSWORD') ? 'shield' : 'edit'; }
  async copy(value: unknown) {
    if (!value) return;
    try { await navigator.clipboard.writeText(String(value)); this.message.set('Copied to clipboard.'); }
    catch { this.error.set('Could not copy. Select and copy the value manually.'); }
    this.more.set(false);
  }
  resetPassword() {
    if (!this.user() || this.busy()) return;
    this.more.set(false);
    this.run(this.api.requestUserPasswordReset(String(field(this.user()!, 'email'))), () => this.message.set('Password reset requested. If eligible, the user will receive an email.'));
  }
}
