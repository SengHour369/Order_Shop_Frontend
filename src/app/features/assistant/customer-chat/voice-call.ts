import { Component, input, output, afterRenderEffect, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LiveVoice } from './live-voice';
@Component({
  selector:'app-voice-call',imports:[FormsModule],
  template:`
    @if(call().isActive() && !call().opened()){
      <aside class="call-bar" aria-label="Active AI call">
        <span role="status">☎ {{call().statusLabel()}} · {{clock(call().remaining())}}</span>
        @if(call().selecting()){<span role="status">{{call().text('Loading product…','កំពុងទាញយកផលិតផល…')}}</span>}
        <button type="button" (click)="call().toggleMute()" [attr.aria-pressed]="call().muted()">{{call().muted()?call().text('Unmute','បើកមីក្រូហ្វូន'):call().text('Mute','បិទមីក្រូហ្វូន')}}</button>
        <button type="button" (click)="call().opened.set(true)">{{call().text('Call details','ព័ត៌មានការហៅ')}}</button>
        @if(call().error()){<span role="alert" class="error">{{call().error()}}</span>}
        <button type="button" class="end" (click)="call().end()">{{call().text('End call','បញ្ចប់ការហៅ')}}</button>
      </aside>
    }
    @if(call().opened()){
      <section #panel class="call" role="dialog" aria-modal="true" aria-labelledby="voice-call-title" (keydown.escape)="call().close()" (keydown.tab)="trap($event)" tabindex="-1">
        <header><button type="button" (click)="call().opened.set(false)">← {{call().text('Return to chat','ត្រឡប់ទៅជជែក')}}</button><h2 id="voice-call-title">E-Shop AI</h2></header>
        <label>{{call().text('Voice language','ភាសាសន្ទនា')}} <select [(ngModel)]="call().language" [disabled]="call().status()!=='ENDED' && call().status()!=='FAILED'"><option value="auto">Auto Detect</option><option value="km">ភាសាខ្មែរ</option><option value="en">English</option></select></label>
        <p class="privacy">{{call().text('Audio and minimized shopping data are sent to Google. Free-tier content may be used to improve Google products. Never share banking secrets.','សំឡេង និងទិន្នន័យទិញទំនិញត្រូវបានផ្ញើទៅ Google។ ទិន្នន័យឥតគិតថ្លៃអាចប្រើសម្រាប់កែលម្អផលិតផល។ កុំចែករំលែកព័ត៌មានសម្ងាត់ធនាគារ។')}}</p>
        <div class="orb" [class.speaking]="call().speaker()" aria-hidden="true">◉</div>
        <p role="status">{{call().statusLabel()}}</p>
        <strong>{{clock(call().seconds())}} · {{clock(call().remaining())}} {{call().text('remaining','នៅសល់')}}</strong>
        <div class="wave" aria-label="Microphone level">@for(scale of scales;track $index){<i [style.height.px]="3+Math.min(65,call().level()*scale)"></i>}</div>
        <div class="transcript" role="log" aria-live="polite" aria-label="Live transcript">@for(turn of call().transcript();track $index){<p><b>{{turn.role}}:</b> {{turn.text}}</p>}</div>
        @if(call().usage();as usage){<p>{{usage.remainingToday}} / {{usage.dailyLimit}} {{call().text('free calls remaining today','ការហៅឥតគិតថ្លៃនៅសល់ថ្ងៃនេះ')}}</p>}
        @if(call().error()){<p role="alert" class="error">{{call().error()}}</p>}
        @if(call().retryAfter()>0 && !call().isActive()){
          <p role="status">{{call().text('The previous call credential is expiring. Retry in','កំពុងរង់ចាំឱ្យសុពលភាពការហៅមុនផុត។ ព្យាយាមម្តងទៀតក្នុង')}} {{clock(call().retryAfter())}}</p>
        }
        @if(call().status()==='ENDED' ||call().status()==='FAILED'){
          <button type="button" class="start" [disabled]="call().retryAfter()>0" (click)="retry.emit()">{{call().text('Start / Retry call','ចាប់ផ្តើម / ព្យាយាមម្តងទៀត')}}</button>
        }@else{
          <footer><button type="button" (click)="call().toggleMute()" [attr.aria-pressed]="call().muted()">{{call().muted()?call().text('Unmute','បើកមីក្រូហ្វូន'):call().text('Mute','បិទមីក្រូហ្វូន')}}</button><button type="button" class="end" (click)="call().end()">{{call().text('End call','បញ្ចប់ការហៅ')}}</button></footer>
        }
        <small>{{call().text('Review product cards, checkout confirmations and payment QR in the chat.','សូមពិនិត្យផលិតផល ការបញ្ជាក់ និង QR ទូទាត់នៅក្នុងការជជែក។')}}</small>
        <button type="button" (click)="call().opened.set(false)">{{call().text('Show chat while calling','បង្ហាញជជែកពេលហៅ')}}</button>
      </section>
    }
  `,
  styles:`
    :host{display:contents}.call-bar{position:sticky;bottom:0;z-index:19;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;background:var(--surface,#fff);border:1px solid #cbd8ef;border-radius:12px;padding:8px;box-shadow:0 -2px 12px #17203312}.call-bar button{padding:6px 10px}.call-bar span{font-size:12px}.call{position:absolute;inset:0;z-index:20;background:var(--surface,#fff);color:var(--text,#172033);display:flex;align-items:center;flex-direction:column;gap:12px;padding:20px;overflow:auto;border-radius:inherit;font-family:inherit}.call header{display:flex;align-items:center;justify-content:space-between;width:100%}h2{font-size:18px}button:disabled{opacity:.55;cursor:not-allowed}button,select{font:inherit;padding:10px 14px;border:1px solid #ccd4e0;border-radius:12px;background:#f1f5fb;color:#18243a;cursor:pointer}.privacy,small{max-width:560px;font-size:12px;line-height:1.6;color:#59677b}.orb{font-size:72px;color:#3978ed;line-height:1.2}.speaking{filter:drop-shadow(0 0 15px #3978ed)}.wave{height:70px;display:flex;align-items:center;gap:5px}.wave i{width:5px;border-radius:4px;background:#3978ed;transition:height 60ms}.transcript{width:min(100%,640px);min-height:90px;max-height:32vh;overflow:auto;background:#f4f7fc;padding:12px;border-radius:14px;line-height:1.7;white-space:pre-wrap}.transcript p{margin:4px}footer{display:flex;gap:20px}.end{background:#c93045;color:white}.start{background:#2866d7;color:white}.error{color:#b42336}p{margin:0}@media(max-width:600px){.call{padding:12px;gap:9px}.orb{font-size:52px}.transcript{max-height:27vh}}
  `,
})
export class VoiceCall {
  private panel=viewChild<ElementRef<HTMLElement>>('panel');
  constructor(){afterRenderEffect(()=>{if(this.call().opened())this.panel()?.nativeElement.querySelector<HTMLButtonElement>('button')?.focus();});}
  readonly call=input.required<LiveVoice>();readonly retry=output();
  readonly scales=[80,140,220,350,480,350,220,140,80];readonly Math=Math;
  trap(event:Event){
    const key=event as KeyboardEvent,root=key.currentTarget as HTMLElement;
    const controls=Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),select:not([disabled])'));
    const first=controls[0],last=controls.at(-1);
    if(key.shiftKey&&document.activeElement===first){key.preventDefault();last?.focus();}
    else if(!key.shiftKey&&document.activeElement===last){key.preventDefault();first?.focus();}
  }
  clock(seconds:number){return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
}
