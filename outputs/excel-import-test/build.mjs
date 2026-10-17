import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const out = new URL('.', import.meta.url).pathname;
const wb = Workbook.create();
const sheet = wb.worksheets.add('Categories');
const rows = [
 ['name','description','status'],
 ['QA-20261017-Audio','Test category for headphones and speakers',true],
 ['QA-20261017-Accessories','Test category for cables and chargers',true],
 ['QA-20261017-Office','Test category for office equipment',true],
 ['QA-20261017-Home','Test category for household products',true],
 ['QA-20261017-Inactive','Test inactive category',false],
 ['QA-20261017-Audio','Test category for headphones and speakers',true],
 ['', 'Intentional error: required name is missing',true],
 ['QA-20261017-BadStatus','Intentional error: status must be a boolean','not-a-boolean'],
];
sheet.getRange('A1:C9').values=rows;
sheet.showGridLines=false;
sheet.getRange('A1:C9').format.font={name:'Arial',size:11,color:'#20314A'};
sheet.getRange('A1:C1').format={fill:'#18395D',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:28};
sheet.getRange('A2:C9').format.rowHeight=28;
sheet.getRange('A1:A9').format.columnWidth=31;
sheet.getRange('B1:B9').format.columnWidth=57;
sheet.getRange('C1:C9').format.columnWidth=20;
sheet.getRange('A1:C9').format.verticalAlignment='center';
sheet.freezePanes.freezeRows(1);
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'Categories!A1:C9',include:'values,formulas',tableMaxRows:9,tableMaxCols:3})).ndjson);
const preview=await wb.render({sheetName:'Categories',range:'A1:C9',scale:1.5,format:'png'});
await fs.writeFile(out+'preview.png',new Uint8Array(await preview.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(wb)).save(out+'excel-import-test.xlsx');
