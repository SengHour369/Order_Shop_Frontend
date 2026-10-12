import { Component, input } from "@angular/core";
const icons: Record<string, string> = {
  barcode: 'M3 4v16 M6 4v16 M9 4v16 M13 4v16 M16 4v16 M18 4v16 M21 4v16',
  image: 'M3 3h18v18H3V3 M3 17l6-6 4 4 3-3 5 5 M9 7h.01',
  flash: 'M13 2L4 14h7l-1 8 10-13h-7l0-7',
  sparkles: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3 M21 2v4 M19 4h4',
  mic: 'M9 3a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0V3 M5 10v1a7 7 0 0 0 14 0v-1 M12 18v4 M8 22h8',
  attachment: 'M8 12l7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l10-10 M6 14l9-9',
  robot:
    "M5 7h14a2 2 0 0 1 2 2v10H3V9a2 2 0 0 1 2-2 M12 3v4 M10 3h4 M7 11v3 M17 11v3 M8 17h8 M1 11v5 M23 11v5",
  send: "M22 2L9 15 M22 2l-7 20-6-7-7-6 20-7",
  calendar: "M3 5h18v16H3V5 M3 10h18 M7 2v6 M17 2v6",
  filter: "M3 3h18l-7 8v9l-4 2V11L3 3",
  download: "M12 2v13 M7 10l5 5 5-5 M3 16v6h18v-6",
  upload:
    "M7 18H5a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 2 10h-2 M12 21V10 M8 14l4-4 4 4",
  save: "M3 3h15l3 3v15H3V3 M7 3v6h10V3 M7 21v-8h10v8",
  "arrow-left": "M20 12H4 M10 6l-6 6 6 6",
  search: "M21 21l-5-5 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0",
  home: "M3 10l9-7 9 7 M5 9v12h5v-7h4v7h5V9",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8",
  cart: "M2 3h3l3 13h11l3-10H6 M10 21h.01 M18 21h.01",
  user: "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2 M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  bag: "M5 7h14l2 15H3L5 7 M8 8V5a4 4 0 0 1 8 0v3",
  box: "M3 7l9-5 9 5v10l-9 5-9-5V7 M3 7l9 5 9-5 M12 12v10 M7 4.5l10 5",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  card: "M3 4h18v16H3V4 M3 9h18 M7 15h4",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M9 2h6l1 3 3 1 3 3v6l-3 1-1 3-3 3H9l-1-3-3-1-3-3V9l3-1 1-3 3-3",
  shield: "M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4 M8 12l3 3 5-6",
  help: "M9 9a3 3 0 1 1 5 2c-2 1-2 1-2 4 M12 18h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  logout: "M10 3H3v18h7 M8 12h14 M17 7l5 5-5 5",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  chevron: "M9 5l7 7-7 7",
  down: "M6 9l6 6 6-6",
  plus: "M12 4v16 M4 12h16",
  close: "M6 6l12 12 M18 6L6 18",
  check: "M5 12l4 4L19 6",
  edit: "M15 4l5 5 M4 20l5-1L21 7l-4-4L5 15l-1 5",
  trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  mail: "M2 4h20v16H2V4 M2 4l10 9L22 4",
  lock: "M5 10h14v12H5V10 M8 10V6a4 4 0 0 1 8 0v4 M12 15v3",
  clock: "M12 7v6l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  truck:
    "M1 4h13v13H1V4 M14 9h4l4 5v3h-8 M8 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M21 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  laptop: "M4 3h16v13H4V3 M1 20h22l-3-4H4l-3 4",
  shirt: "M8 3l4 3 4-3 6 4-3 5-3-2v12H8V10l-3 2-3-5 6-4",
  sofa: "M5 12V6h14v6 M2 12h4v5h12v-5h4v10H2V12 M5 22v2 M19 22v2",
  star: "M12 2l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-7",
  tag: "M2 3h9l11 11-8 8L2 10V3 M7 7h.01",
  grid: "M3 3h7v7H3V3 M14 3h7v7h-7V3 M3 14h7v7H3v-7 M14 14h7v7h-7v-7",
  list: "M8 5h14 M8 12h14 M8 19h14 M2 5h.01 M2 12h.01 M2 19h.01",
  gift: "M3 8h18v5H3V8 M5 13v9h14v-9 M12 8v14 M12 8C0 7 5-4 12 8 M12 8c12-1 7-12 0 0",
  phone: "M6 2h12v20H6V2 M10 18h4",
  camera: "M3 6h4l2-3h6l2 3h4v15H3V6 M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  refresh:
    "M21 7v5h-5 M3 17v-5h5 M4 8a8 8 0 0 1 14-3l3 4 M20 16a8 8 0 0 1-14 3l-3-4",
  headphones: "M3 14v-3a9 9 0 0 1 18 0v3 M3 12h4v9H3v-9 M17 12h4v9h-4v-9",
  beauty: "M8 8h8v14H8V8 M10 3h4v5h-4V3",
  sports: "M2 8v8 M6 5v14 M6 12h12 M18 5v14 M22 8v8",
  game: "M6 7h12l4 12-4 2-4-5h-4l-4 5-4-2L6 7 M6 11h5 M8.5 8.5v5 M17 11h.01",
  wallet: "M3 5h17v16H3V5 M3 5V2h14 M15 11h7v5h-7v-5",
  bank: "M2 8l10-6 10 6H2 M5 8v11 M10 8v11 M15 8v11 M20 8v11 M2 22h20",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  chart: "M4 19V5 M4 19h16 M8 15l3-4 3 2 4-6",
};
@Component({
  selector: "app-icon",
  host: { "aria-hidden": "true" },
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="path()"/></svg>',
  styles: [
    ":host{display:inline-flex;width:22px;height:22px;flex-shrink:0;vertical-align:middle}svg{width:100%;height:100%}",
  ],
})
export class Icon {
  name = input("box");
  path() {
    return icons[this.name()] || icons["box"];
  }
}
