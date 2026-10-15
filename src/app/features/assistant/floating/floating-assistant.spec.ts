import { TestBed } from '@angular/core/testing';
import { provideRouter,Router } from '@angular/router';
import { FloatingAssistant } from './floating-assistant';
describe('Floating existing assistant launcher',()=>{
 beforeEach(()=>{vi.useFakeTimers();TestBed.configureTestingModule({providers:[provideRouter([])]});});
 afterEach(()=>{TestBed.resetTestingModule();vi.useRealTimers();});
 function setup(){const fixture=TestBed.createComponent(FloatingAssistant);fixture.detectChanges();const button=fixture.nativeElement.querySelector('button') as HTMLButtonElement;Object.defineProperty(button,'getBoundingClientRect',{value:()=>({left:200,top:200,width:56,height:56})});return {fixture,button};}
 function pointer(button:HTMLElement,type:string,x:number,y:number){const e=new MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y,cancelable:true});Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true}});button.dispatchEvent(e);}
 it('starts fading at exactly two seconds without opening chat or sending a message',()=>{const {fixture}=setup();const navigate=vi.spyOn(TestBed.inject(Router),'navigate');expect(fixture.componentInstance.welcome()).toBe(true);vi.advanceTimersByTime(1999);expect(fixture.componentInstance.welcome()).toBe(true);vi.advanceTimersByTime(1);expect(fixture.componentInstance.welcome()).toBe(false);expect(navigate).not.toHaveBeenCalled();});
 it('opens the existing route on a tap but suppresses click after a drag',()=>{const {button}=setup();const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);pointer(button,'pointerdown',210,210);pointer(button,'pointermove',8000,8000);pointer(button,'pointerup',8000,8000);button.click();expect(navigate).not.toHaveBeenCalled();expect(parseFloat(button.style.left)).toBeLessThanOrEqual(window.innerWidth-64);expect(parseFloat(button.style.top)).toBeLessThanOrEqual(window.innerHeight-64);pointer(button,'pointerdown',210,210);pointer(button,'pointerup',210,210);button.click();expect(navigate).toHaveBeenCalledWith(['/admin/assistant']);});
 it('supports keyboard movement and clamps the speech bubble',()=>{const {fixture,button}=setup();button.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',altKey:true,bubbles:true}));expect(button.style.left).toBe('188px');expect(fixture.componentInstance.bubbleX(-100)).toBe(8);expect(fixture.componentInstance.bubbleY(8)).toBe(72);});
 it('cancels its welcome timer on destruction',()=>{const {fixture}=setup();fixture.destroy();expect(vi.getTimerCount()).toBe(0);});
});
