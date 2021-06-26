`use strict`;

import { RoomMap } from "./display.js";

const roomName = `W0N0`;

initMonitor();

initEditor();

const REFRESH_INTERVAL = 16;
const roomMap = new RoomMap();
setInterval(() => roomMap.play(), REFRESH_INTERVAL);

const log = (info) => {
  info = info.stdout.split(`\n`);
  _.forEach(info, (line) =>
    consoleOutput(`[${line.slice(0, 24)}]:`, line.slice(25))
  );
};

const REQUEST_INTERVAL = 1000;
setInterval(
  () => data(`getRoomData`, { roomName }, roomMap.refresh.bind(roomMap)),
  REQUEST_INTERVAL
);
setInterval(() => data(`getLog`, {}, (json) => log(json)), REQUEST_INTERVAL);

const AUTOSAVE_INTERVAL = 5000;
setInterval(() => {
  const script = ace.edit("codeEditor").getValue();
  data(`setScript`, { script }, () => {}); // TODO: save-on-change
}, AUTOSAVE_INTERVAL);
