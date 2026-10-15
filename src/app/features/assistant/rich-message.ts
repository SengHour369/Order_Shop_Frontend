import { Component, computed, forwardRef, input, signal } from '@angular/core';

interface Inline {kind:'text'|'strong'|'em'|'code'|'link';text:string;href?:string;}
interface Block {kind:'paragraph'|'heading'|'quote'|'list'|'table'|'code';text?:string;level?:number;language?:string;lines?:{depth:number;marker:string;text:string}[];rows?:string[][];}
export function inlineMarkdown(text:string):Inline[]{
 const result:Inline[]=[];const pattern=/(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\))/g;let start=0;
 for(const match of text.matchAll(pattern)){const index=match.index!;if(index>start)result.push({kind:'text',text:text.slice(start,index)});const s=match[0];
  if(s.startsWith('`'))result.push({kind:'code',text:s.slice(1,-1)});
  else if(s.startsWith('**'))result.push({kind:'strong',text:s.slice(2,-2)});
  else if(s.startsWith('*'))result.push({kind:'em',text:s.slice(1,-1)});
  else{const parts=/^\[([^\]]+)\]\((.+)\)$/.exec(s)!;let safe=false;try{const url=new URL(parts[2],window.location.origin);safe=['http:','https:','mailto:'].includes(url.protocol)&&!/[\u0000-\u0020]/.test(parts[2]);}catch{}result.push(safe?{kind:'link',text:parts[1],href:parts[2]}:{kind:'text',text:s});}start=index+s.length;
 }if(start<text.length)result.push({kind:'text',text:text.slice(start)});return result;
}
export function markdownBlocks(value:string):Block[]{
 const lines=value.slice(0,80000).replace(/\r\n?/g,'\n').split('\n'),blocks:Block[]=[];
 for(let i=0;i<lines.length;i++){const line=lines[i];if(!line.trim())continue;
  const fence=/^\s*```([\w+-]*)\s*$/.exec(line);if(fence){const content:string[]=[];while(++i<lines.length&&!/^\s*```\s*$/.test(lines[i]))content.push(lines[i]);blocks.push({kind:'code',language:fence[1]||'text',text:content.join('\n')});continue;}
  const heading=/^(#{1,6})\s+(.+)$/.exec(line);if(heading){blocks.push({kind:'heading',level:heading[1].length,text:heading[2]});continue;}
  if(/^>\s?/.test(line)){blocks.push({kind:'quote',text:line.replace(/^>\s?/,'')});continue;}
  if(line.includes('|')&&i+1<lines.length&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])){const cells=(s:string)=>s.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());const rows=[cells(line)];i++;while(i+1<lines.length&&lines[i+1].includes('|'))rows.push(cells(lines[++i]));blocks.push({kind:'table',rows});continue;}
  if(/^\s*(?:[-+*]|\d+\.)\s+/.test(line)){const items:NonNullable<Block['lines']>=[];while(i<lines.length){const match=/^(\s*)([-+*]|\d+\.)\s+(.+)$/.exec(lines[i]);if(!match)break;items.push({depth:Math.min(8,Math.floor(match[1].replace(/\t/g,'    ').length/2)),marker:/\d/.test(match[2])?match[2]:'•',text:match[3]});i++;}i--;blocks.push({kind:'list',lines:items});continue;}
  blocks.push({kind:'paragraph',text:line});
 }return blocks;
}
export function codeTokens(code:string){const tokens:{text:string;kind:string}[]=[];const pattern=/(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|class|public|private|return|if|else|import|from|def|async|await|true|false|null|None|new|throw|try|catch)\b|\b\d+(?:\.\d+)?\b)/g;let start=0;for(const m of code.matchAll(pattern)){if(m.index!>start)tokens.push({text:code.slice(start,m.index),kind:''});const text=m[0];tokens.push({text,kind:/^["']/.test(text)?'string':/^\d/.test(text)?'number':/^(\/\/|#)/.test(text)?'comment':'keyword'});start=m.index!+text.length;}tokens.push({text:code.slice(start),kind:''});return tokens;}
@Component({selector:'app-rich-message',template:`
 @for(block of blocks();track $index){@switch(block.kind){
 @case('code'){<section class="code-block"><header><span>{{block.language}}</span><button type="button" (click)="copy(block.text || '')">Copy code</button></header><pre><code>@for(token of tokens(block.text || '');track $index){<span [class]="token.kind">{{token.text}}</span>}</code></pre></section>}
 @case('table'){<div class="table-scroll" tabindex="0" aria-label="Response table"><table>@for(row of block.rows;track $index){<tr>@for(cell of row;track $index){@if(row===block.rows?.[0]){<th><app-inline-message [text]="cell"/></th>}@else{<td><app-inline-message [text]="cell"/></td>}}</tr>}</table></div>}
 @case('heading'){<div class="heading" role="heading" [attr.aria-level]="block.level"><app-inline-message [text]="block.text || ''"/></div>}
 @case('quote'){<blockquote><app-inline-message [text]="block.text || ''"/></blockquote>}
 @case('list'){<div role="list" class="markdown-list">@for(item of block.lines;track $index){<div role="listitem" [style.padding-left.px]="item.depth*18"><span class="marker">{{item.marker}}</span><app-inline-message [text]="item.text"/></div>}</div>}
 @default{<p><app-inline-message [text]="block.text || ''"/></p>}
 }}<span class="copy-status" role="status">{{notice()}}</span>
 `,styles:[`:host{display:block;min-width:0;overflow-wrap:anywhere;font-family:Inter,'Kantumruy Pro',sans-serif;line-height:1.65}p{white-space:pre-wrap;margin:0 0 .6em}.heading{font-size:1.15em;font-weight:700;margin:.9em 0 .4em}blockquote{border-left:3px solid #7ba7db;padding:4px 14px;margin:10px 0;color:inherit}.markdown-list{margin:8px 0}.markdown-list>div{display:flex;gap:8px}.marker{min-width:20px}.code-block{margin:12px 0;border:1px solid #2a3c55;border-radius:10px;overflow:hidden;background:#111b2c;color:#ebf2fa}.code-block header{display:flex;align-items:center;justify-content:space-between;background:#233044;padding:6px 12px;font-size:12px}.code-block button{color:#fff;background:transparent;border:1px solid #617086;border-radius:5px;padding:4px 9px;cursor:pointer}pre{overflow:auto;max-width:100%;padding:14px;margin:0;white-space:pre;font-family:ui-monospace,monospace;font-size:12px}.keyword{color:#c7a6ff}.string{color:#9bd5a9}.number{color:#ffd087}.comment{color:#9aa9bd}.table-scroll{overflow-x:auto;margin:12px 0}table{border-collapse:collapse;width:100%;min-width:300px}td,th{border:1px solid #99a9bd66;padding:8px 12px;text-align:left}th{font-weight:700}.copy-status{font-size:11px}`],imports:[forwardRef(()=>InlineMessage)]})
export class RichMessage {text=input('');blocks=computed(()=>markdownBlocks(this.text()));tokens=codeTokens;notice=signal('');async copy(text:string){try{await navigator.clipboard.writeText(text);this.notice.set('Code copied');}catch{this.notice.set('Copy unavailable. Select the code to copy it.');}}}
@Component({selector:'app-inline-message',template:`@for(part of parts();track $index){@switch(part.kind){@case('strong'){<strong>{{part.text}}</strong>}@case('em'){<em>{{part.text}}</em>}@case('code'){<code>{{part.text}}</code>}@case('link'){<a [href]="part.href" target="_blank" rel="noopener noreferrer">{{part.text}}</a>}@default{<span>{{part.text}}</span>}}}`,styles:[`code{background:#8497b522;padding:2px 5px;border-radius:4px;font-family:ui-monospace,monospace}a{color:#137ae7;text-decoration:underline}`]})
export class InlineMessage {text=input('');parts=computed(()=>inlineMarkdown(this.text()));}


