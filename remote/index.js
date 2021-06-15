"use strict";

import { Display } from "./display.js";

let canvas = document.createElement("div");
let monitor = document.querySelector(".upper-left-monitor");
canvas.className = "pixi-canvas";
canvas.style.width =
  0.8 * Math.min(monitor.offsetWidth, monitor.offsetHeight) + "px";
canvas.style.height = canvas.style.width;
canvas.style.position = "absolute";
monitor.appendChild(canvas);
canvas.style.left = 0.5 * (monitor.offsetWidth - canvas.offsetWidth) + "px";
canvas.style.top = 0.5 * (monitor.offsetHeight - canvas.offsetHeight) + "px";

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
