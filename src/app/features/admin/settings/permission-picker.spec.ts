import { TestBed } from '@angular/core/testing';
import { PermissionPicker } from './permission-picker';
describe('Permission picker', () => {
  function setup() {
    const fixture = TestBed.createComponent(PermissionPicker);
    fixture.componentRef.setInput('rows', [
      {func_id:1,func_name:'View orders',func_code:'ORDER_VIEW',module:'ORDER',is_active:true},
      {func_id:2,func_name:'Manage orders',func_code:'ORDER_MANAGE',module:'ORDER',is_active:true},
      {func_id:3,func_name:'View products',func_code:'PRODUCT_VIEW',module:'PRODUCT',is_active:true},
      {func_id:4,func_name:'Disabled',module:'ORDER',is_active:false},
    ]);
    return fixture;
  }
  it('selects only active permissions in a module', () => {
    const picker = setup().componentInstance;
    picker.toggleModule('ORDER'); expect([...picker.selected()]).toEqual([1,2]);
    picker.toggleModule('ORDER'); expect(picker.selected().size).toBe(0);
  });
  it('searches codes and selects only matching results', () => {
    const picker = setup().componentInstance;
    picker.query.set('PRODUCT_VIEW'); picker.selectVisible();
    expect([...picker.selected()]).toEqual([3]);
  });
  it('keeps saved assignments locked when clearing or toggling', () => {
    const fixture = setup(), picker = fixture.componentInstance;
    fixture.componentRef.setInput('locked', new Set([1])); picker.selected.set(new Set([1,2]));
    picker.toggle(1); expect(picker.selected().has(1)).toBe(true);
    picker.clear(); expect([...picker.selected()]).toEqual([1]);
  });
  it('renders a bounded set while searching every permission in a large directory', () => {
    const fixture = setup(), picker = fixture.componentInstance;
    fixture.componentRef.setInput('rows', Array.from({length:10000}, (_, i) => ({func_id:i+1,func_name:`Permission ${i}`,func_code:`CODE_${i}`,module:'LARGE',is_active:true})));
    expect(picker.visible().length).toBe(100);
    picker.query.set('CODE_9999');
    expect(picker.visible().length).toBe(1);
    picker.selectVisible(); expect([...picker.selected()]).toEqual([10000]);
  });

});
