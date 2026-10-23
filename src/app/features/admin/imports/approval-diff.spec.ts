import { approvalChanges } from './approval-diff';
describe('Backend approval snapshots',()=>{
 it('compares actual fields including nested SKU fields without adding mockup fields',()=>{const rows=approvalChanges('{"name":"Before","skus":"[{\\"price\\":12}]"}','{"name":"After","skus":"[{\\"price\\":15}]"}',false);expect(rows.find(row=>row.field==='name')?.change).toBe('Modified');expect(rows.find(row=>row.field==='skus[0].price')).toMatchObject({before:'12',after:'15',change:'Modified'});expect(rows.map(row=>row.field)).not.toContain('promotionPrice');});
 it('marks missing live snapshots unverified rather than pretending fields were added',()=>{expect(approvalChanges(null,'{"name":"Proposed"}',false)[0].change).toBe('Unverified');expect(approvalChanges('{}','{"name":"New"}',true)[0].change).toBe('Added');});
 it('keeps unchanged fields and excludes revision/image proof fields',()=>{const rows=approvalChanges('{"name":"Same"}','{"name":"Same","expectedVersion":"1","imageChecksums":"proof"}',false);expect(rows).toEqual([{field:'name',before:'Same',after:'Same',change:'No change'}]);});
});
