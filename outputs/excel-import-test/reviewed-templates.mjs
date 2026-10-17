import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const out=new URL('.',import.meta.url).pathname;
const templates=[
 ['Categories','category-create-template.xlsx',[['name','description','status'],['','',true]]],
 ['Products','product-create-template.xlsx',[['name','subCategoryId','description','isActive','imageIds','imageChecksums'],['',null,'',true,'','']]],
 ['Product SKUs','product-sku-create-template.xlsx',[['productId','description','price','quantity','barcode'],[null,'',null,0,'']]],
];
for(const [name,file,values] of templates){
 const wb=Workbook.create(),sheet=wb.worksheets.add(name),last=String.fromCharCode(64+values[0].length);
 sheet.getRange(`A1:${last}2`).values=values;sheet.showGridLines=false;
 sheet.getRange(`A1:${last}2`).format.font={name:'Arial',size:11,color:'#20314A'};
 sheet.getRange(`A1:${last}2`).format.columnWidth=24;
 sheet.getRange(`A1:${last}2`).format.rowHeight=30;
 sheet.getRange(`A1:${last}1`).format={fill:'#18395D',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:30};
 sheet.getRange(`A2:${last}2`).format.fill='#FFF2CC';
 const desc=values[0].indexOf('description');
 if(desc>=0)sheet.getRange(`${String.fromCharCode(65+desc)}1:${String.fromCharCode(65+desc)}2`).format.columnWidth=45;
 if(name==='Product SKUs'){sheet.getRange('C2').setNumberFormat('0.00');sheet.getRange('D2').setNumberFormat('0');}
 sheet.freezePanes.freezeRows(1);wb.recalculate();
 console.log((await wb.inspect({kind:'table',range:`'${name}'!A1:${last}2`,include:'values,formulas',tableMaxRows:2,tableMaxCols:6})).ndjson);
 const png=await wb.render({sheetName:name,autoCrop:'all',scale:1,format:'png'});
 await fs.writeFile(out+file+'.png',new Uint8Array(await png.arrayBuffer()));
 await (await SpreadsheetFile.exportXlsx(wb)).save(out+file);
}
