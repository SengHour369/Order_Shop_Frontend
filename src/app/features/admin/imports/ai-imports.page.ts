import {Component,inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AiImportComponent} from './ai-import.component';
import {ImportMode} from './ai-imports.api';
import {ImportExecutionsComponent} from './import-executions.component';
import {toSignal} from '@angular/core/rxjs-interop';
@Component({imports:[AiImportComponent,ImportExecutionsComponent],template:`@if(mode==='executions'){<app-import-executions [initialBatchId]="batch"/>}@else{<app-ai-import [mode]="mode" [initialBatchId]="batch"/>}`})
export class AiImportsPage{
 private route=inject(ActivatedRoute);
 mode=this.route.snapshot.data['importMode'] as ImportMode??'upload';
 private params=toSignal(this.route.queryParamMap,{initialValue:this.route.snapshot.queryParamMap});
 get batch(){return this.params().get('batch')??'';}
}
