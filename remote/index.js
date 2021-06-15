/** @format */

"use strict";

import { Display } from "./display.js";

function main() {
  fetch(`http://127.0.0.1:8080/`, {
    method: `POST`,
    body: `{"request": "getRoomData", "roomName": "W0N0"}`,
  })
    .then((response) => response.json())
    .then((json) => refresh(json));
}

function refresh(object) {
  info = object;
  if (cnt == 0) {
    console.log(object);
    cnt++;
  }
}

const REFRESH_INTERVAL = 1000;
const display = new Display();
let info;
let cnt = 0;

setInterval(main, REFRESH_INTERVAL);
display.ticker.add(() => display.display(info));
