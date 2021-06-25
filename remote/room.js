`use strict`;

import { RoomMap } from "./display.js";

const name = `Alice`,
  roomName = `W0N0`;

/** init two-canvas */
{
  const monitor = document.querySelector("#upper-left-monitor"),
    canvas = document.createElement(`div`);
  canvas.id = `two-canvas`;
  const size = 0.8 * Math.min(monitor.offsetWidth, monitor.offsetHeight);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.style.backgroundColor = "#2b2b2b";
  const left = 0.5 * (monitor.offsetWidth - size);
  canvas.style.left = `${left}px`;
  const top = 0.5 * (monitor.offsetHeight - size);
  canvas.style.top = `${top}px`;
  monitor.appendChild(canvas);
}

let script0;
/** init script editor */
{
  const editor = ace.edit("codeEditor");
  const theme = "tomorrow_night";
  const language = "javascript";
  editor.setTheme("ace/theme/" + theme);
  editor.session.setMode("ace/mode/" + language);
  editor.setFontSize(12);
  editor.setReadOnly(false);
  editor.session.setTabSize(2);
  editor.setShowPrintMargin(false);
  data(`getScript`, {}, (json) => editor.setValue((script0 = json)));
}

const REFRESH_INTERVAL = 16;
const roomMap = new RoomMap();
setInterval(() => roomMap.play(), REFRESH_INTERVAL);

{
  const canvas = document.querySelector("#two-canvas");
  canvas.onmousemove = function (event) {
    roomMap.mouseSelector(
      (event.pageX - canvas.offsetLeft) / canvas.offsetWidth,
      (event.pageY - canvas.offsetTop) / canvas.offsetHeight
    );
  };
}

function data(request, opts, callback = () => {}) {
  const body = { auth: { name }, request },
    chunks = window.location.href.split(`/`);
  fetch(`http://127.0.0.1:8080/data`, {
    method: `POST`,
    body: JSON.stringify(Object.assign(body, opts)),
  })
    .then((response) => response.json())
    .then((json) => {
      console.log(json);
      if (json === `Error: Not Available` || json === `Error: Not Found`)
        window.location.replace(`${_.initial(chunks).join(`/`)}/login`);
      return json;
    })
    .then((json) => callback(json));
}

function log(info) {
  info = info.stdout.split(`\n`);
  _.forEach(info, (line) =>
    consoleOutput(`[${line.slice(0, 24)}]:`, line.slice(25))
  );
}

const REQUEST_INTERVAL = 1000;
setInterval(
  () => data(`getRoomData`, { roomName }, roomMap.refresh.bind(roomMap)),
  REQUEST_INTERVAL
);
setInterval(() => data(`getLog`, {}, (json) => log(json)), REQUEST_INTERVAL);

const AUTOSAVE_INTERVAL = 5000;
setInterval(() => {
  const script = ace.edit("codeEditor").getValue();
  if (script !== script0) data(`setScript`, { script }, () => {});
}, AUTOSAVE_INTERVAL);
