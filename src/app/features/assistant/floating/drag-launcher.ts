import { Directive, ElementRef, DestroyRef, afterNextRender, inject, signal } from '@angular/core';

/** Pointer capture keeps mouse/touch dragging local to the existing launcher. */
@Directive({selector:'[appDragLauncher]',exportAs:'dragLauncher',host:{'[style.touch-action]':'"none"'}})
export class DragLauncher {
  private element=inject(ElementRef<HTMLElement>).nativeElement;
  private destroy=inject(DestroyRef);
  readonly position=signal({x:0,y:0,width:56,height:56});
  private pointer:number|null=null;
  private start={x:0,y:0,left:0,top:0};
  private moved=false;
  private suppress=false;
  constructor(){
    afterNextRender(()=>this.clamp());
    this.listen(this.element,'pointerdown',e=>this.down(e as PointerEvent));
    this.listen(this.element,'pointermove',e=>this.move(e as PointerEvent));
    this.listen(this.element,'pointerup',e=>this.up(e as PointerEvent));
    this.listen(this.element,'pointercancel',e=>this.up(e as PointerEvent));
    this.listen(this.element,'lostpointercapture',()=>{this.pointer=null;});
    this.listen(this.element,'click',e=>{if(this.suppress){e.preventDefault();e.stopImmediatePropagation();this.suppress=false;}},true);
    this.listen(this.element,'keydown',e=>{const key=e as KeyboardEvent;if(key.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key.key)){key.preventDefault();const r=this.element.getBoundingClientRect();this.place(r.left+(key.key==='ArrowLeft'?-12:key.key==='ArrowRight'?12:0),r.top+(key.key==='ArrowUp'?-12:key.key==='ArrowDown'?12:0));}});
    this.listen(window,'resize',()=>this.clamp());
    if(window.visualViewport){this.listen(window.visualViewport,'resize',()=>this.clamp());this.listen(window.visualViewport,'scroll',()=>this.clamp());}
  }
  private listen(target:EventTarget,type:string,listener:EventListener,capture=false){target.addEventListener(type,listener,capture);this.destroy.onDestroy(()=>target.removeEventListener(type,listener,capture));}
  private down(e:PointerEvent){if(this.pointer!==null||e.button!==0||e.isPrimary===false)return;this.suppress=false;this.pointer=e.pointerId;this.moved=false;const r=this.element.getBoundingClientRect();this.start={x:e.clientX,y:e.clientY,left:r.left,top:r.top};this.element.setPointerCapture?.(e.pointerId);}
  private move(e:PointerEvent){if(e.pointerId!==this.pointer)return;const dx=e.clientX-this.start.x,dy=e.clientY-this.start.y;if(!this.moved&&Math.hypot(dx,dy)<6)return;this.moved=true;e.preventDefault();this.place(this.start.left+dx,this.start.top+dy);}
  private up(e:PointerEvent){if(e.pointerId!==this.pointer)return;this.suppress=this.moved;this.pointer=null;if(this.element.hasPointerCapture?.(e.pointerId))this.element.releasePointerCapture(e.pointerId);}
  clamp(){const r=this.element.getBoundingClientRect();this.place(r.left,r.top);}
  private place(x:number,y:number){const r=this.element.getBoundingClientRect(),v=window.visualViewport;const left=(v?.offsetLeft??0)+8,top=(v?.offsetTop??0)+8;const width=r.width||56,height=r.height||56;x=Math.max(left,Math.min(x,left+(v?.width??window.innerWidth)-16-width));y=Math.max(top,Math.min(y,top+(v?.height??window.innerHeight)-16-height));Object.assign(this.element.style,{position:'fixed',left:x+'px',top:y+'px',right:'auto',bottom:'auto'});this.position.set({x,y,width,height});}
}
