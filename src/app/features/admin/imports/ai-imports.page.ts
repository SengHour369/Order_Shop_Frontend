import {Component,inject} from '@angular/core';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {AiImportComponent} from './ai-import.component';
import {ImportMode} from './ai-imports.api';
import {PermissionService} from '../../../core/auth/permission.service';
import {toSignal} from '@angular/core/rxjs-interop';
@Component({imports:[AiImportComponent,RouterLink],template:`<nav class="import-nav" aria-label="Import workflows">@if(access.has('IMPORT_UPLOAD')){<a routerLink="/admin/imports">Upload & analyze</a>}@if(access.has('IMPORT_REVIEW')){<a routerLink="/admin/import-approvals">Pending approvals</a>}<a routerLink="/admin/import-executions">Execution history</a></nav><app-ai-import [mode]="mode" [initialBatchId]="batch"/>`,styles:[`.import-nav{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}.import-nav a{padding:8px 14px;border:1px solid #dbe7fa;border-radius:7px;color:#0866ff;background:white;font-size:13px}`]})
export class AiImportsPage{
 access=inject(PermissionService);private route=inject(ActivatedRoute);
 mode=this.route.snapshot.data['importMode'] as ImportMode??'upload';
 private params=toSignal(this.route.queryParamMap,{initialValue:this.route.snapshot.queryParamMap});
 get batch(){return this.params().get('batch')??'';}
}
