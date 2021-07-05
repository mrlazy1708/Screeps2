`use strict`;

import { RoomMap } from "./display.js";

const origin = `${window.location.protocol}//${window.location.host}`;

const SAVEBACK_INTERVAL = 5000;
const editor = ace.edit("codeEditor");

const printLog = (info) => {
  info = info.split(`\n`);
  _.forEach(info, (line) => {
    if (line.startsWith(`2021-`))
      consoleOutput(`[${line.slice(0, 24)}]:`, line.slice(25));
    else if (line !== ``)
      consoleOutput(`[${new Date().toJSON()}]:`, `${line}`, `#ff0033`);
  });
};

async function room(roomMap) {
  const { interval, time, alive } = await data(`getMeta`),
    delta = interval - (new Date() % (interval - 1));
  await new Promise((res) => setTimeout(() => res(), delta));

  const roomName = window.sessionStorage.getItem(`room`);
  const info = await data(`getRoomData`, { roomName });
  if (info === `Error: Not Found`) window.location.replace(`${origin}/shard`);
  else roomMap.refresh(info);

  const log = await data(`getLog`);
  printLog(log.stdout);
  printLog(log.stderr);

  room(roomMap);
}

async function main() {
  await initMonitor();
  await initCanvasButton();
  await initEditor();

  const REFRESH_INTERVAL = 16;
  const roomMap = new RoomMap();
  setInterval(() => roomMap.play(), REFRESH_INTERVAL);

  room(roomMap);

  let lastSave = new Date();

  editor.on(`change`, () => {
    if (new Date() - lastSave > SAVEBACK_INTERVAL) {
      lastSave = new Date();
      data(`setScript`, { script: editor.getValue() });
      console.log(`saved👌`);
    }
  });
}
main();
