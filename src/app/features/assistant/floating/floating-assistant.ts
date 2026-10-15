import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from '../../../shared/components/icon';
import { DragLauncher } from './drag-launcher';
import { AssistantLauncherState } from './launcher-state';

@Component({selector:'app-floating-assistant',imports:[Icon,DragLauncher],template:`
  <button #drag="dragLauncher" appDragLauncher class="floating-ai" type="button" (click)="open()" [hidden]="chatRoute()" aria-label="Open existing AI assistant. Alt and arrow keys move this button." title="AI assistant · drag to move" aria-haspopup="false"><app-icon name="robot"/></button>
  @if(!chatRoute()) {<div class="welcome" role="status" [class.fading]="!welcome()" [style.left.px]="bubbleX(drag.position().x)" [style.top.px]="bubbleY(drag.position().y)" [attr.aria-hidden]="!welcome()">Is there anything I can do to help you?</div>}
`,styles:[`
 :host{--ai-launcher-size:56px}.floating-ai{position:fixed;right:24px;bottom:88px;width:56px;height:56px;border:1px solid #ffffff70;border-radius:50%;background:linear-gradient(145deg,#1689ff,#0057df);color:white;box-shadow:0 8px 28px #125bc44a;z-index:800;display:grid;place-items:center;cursor:grab;user-select:none}.floating-ai[hidden]{display:none}.floating-ai:active{cursor:grabbing}.floating-ai:focus-visible{outline:3px solid #76b7ff;outline-offset:4px}.floating-ai app-icon{width:28px;height:28px;pointer-events:none}.welcome{position:fixed;z-index:801;width:min(250px,calc(100vw - 24px));padding:13px 16px;border-radius:16px;background:var(--surface,#fff);color:var(--text,#14213d);border:1px solid #dce8fa;box-shadow:0 8px 28px #14213d20;font-size:13px;pointer-events:none;opacity:1;transition:opacity 180ms ease,transform 180ms ease}.welcome.fading{opacity:0;transform:translateY(4px);visibility:hidden;transition:opacity 180ms ease,transform 180ms ease,visibility 0s 180ms}@media(prefers-reduced-motion:reduce){.welcome{transition:none}}@media(max-width:600px){.floating-ai{right:16px;bottom:96px}}
`]})
export class FloatingAssistant {
 private router=inject(Router);private destroy=inject(DestroyRef);private state=inject(AssistantLauncherState);
 welcome=signal(true);chatRoute=signal(this.router.url.startsWith('/admin/assistant'));
 constructor(){const timer=setTimeout(()=>this.welcome.set(false),2000);this.destroy.onDestroy(()=>clearTimeout(timer));this.router.events.pipe(takeUntilDestroyed(this.destroy)).subscribe(event=>{if(event instanceof NavigationEnd)this.chatRoute.set(event.urlAfterRedirects.startsWith('/admin/assistant'));});}
 bubbleX(x:number){return Math.max(8,Math.min(x-260,window.innerWidth-Math.min(250,window.innerWidth-24)-24));}
 bubbleY(y:number){return y<90?y+64:Math.max(8,y-74);}
 open(){this.welcome.set(false);this.state.returnUrl=this.router.url;void this.router.navigate(['/admin/assistant']);}
}
