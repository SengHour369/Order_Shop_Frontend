import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const out=new URL('.',import.meta.url).pathname;
const wb=Workbook.create();
const datasets={
 Categories:[['name','description','status'],
 ['QA-Catalog-Electronics','Test electronics category',true],
 ['QA-Catalog-Fashion','Test fashion category',true],
 ['QA-Catalog-Home','Test home category',true]],
 Subcategories:[['name','categoryId','description','status'],
 ['QA-Headphones',null,'Parent: QA-Catalog-Electronics',true],
 ['QA-Phone-Accessories',null,'Parent: QA-Catalog-Electronics',true],
 ['QA-Shoes',null,'Parent: QA-Catalog-Fashion',true],
 ['QA-Bags',null,'Parent: QA-Catalog-Fashion',true],
 ['QA-Kitchen',null,'Parent: QA-Catalog-Home',true],
 ['QA-Lighting',null,'Parent: QA-Catalog-Home',true]],
 Products:[['name','subCategoryId','description','isActive','imageIds','imageChecksums'],
 ['QA-Wireless-Headphones',null,'Subcategory: QA-Headphones. Wireless over-ear headphones.',true,null,null],
 ['QA-USB-C-Charger',null,'Subcategory: QA-Phone-Accessories. USB-C wall charger.',true,null,null],
 ['QA-Running-Shoes',null,'Subcategory: QA-Shoes. Lightweight running shoes.',true,null,null],
 ['QA-Travel-Backpack',null,'Subcategory: QA-Bags. Everyday travel backpack.',true,null,null],
 ['QA-Ceramic-Mug',null,'Subcategory: QA-Kitchen. Reusable ceramic mug.',true,null,null],
 ['QA-Desk-Lamp',null,'Subcategory: QA-Lighting. Adjustable desk lamp.',true,null,null]],
};
for(const [name,values] of Object.entries(datasets)){
 const sheet=wb.worksheets.add(name);const last=String.fromCharCode(64+values[0].length);const range=`A1:${last}${values.length}`;
 sheet.getRange(range).values=values;sheet.showGridLines=false;
 sheet.getRange(range).format.font={name:'Arial',size:11,color:'#20314A'};
 sheet.getRange(range).format.rowHeight=34;sheet.getRange(range).format.verticalAlignment='center';
 sheet.getRange(`A1:${last}1`).format={fill:'#18395D',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:30};
 sheet.getRange(`A1:A${values.length}`).format.columnWidth=32;
 for(let col=1;col<values[0].length;col++){
  const letter=String.fromCharCode(65+col);const header=values[0][col];
  sheet.getRange(`${letter}1:${letter}${values.length}`).format.columnWidth=header==='description'?78:22;
 }
 if(name!=='Categories')sheet.getRange(`B2:B${values.length}`).format.fill='#FFF2CC';
 if(name==='Products')sheet.getRange(`E2:F${values.length}`).format.fill='#FFF2CC';
 sheet.freezePanes.freezeRows(1);
}
wb.recalculate();
for(const name of Object.keys(datasets)){
 console.log((await wb.inspect({kind:'table',range:`${name}!A1:F7`,include:'values',tableMaxRows:7,tableMaxCols:6})).ndjson);
 const preview=await wb.render({sheetName:name,autoCrop:'all',scale:1,format:'png'});
 await fs.writeFile(out+name+'-preview.png',new Uint8Array(await preview.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(out+'categories-subcategories-products.xlsx');
