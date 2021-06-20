"use strict";

import { Display } from "./display.js";

function initCanvas() {
  const canvas = document.createElement("div");
  const monitor = document.querySelector("#upper-left-monitor");
  canvas.id = "two-canvas";
  canvas.style.width =
    0.8 * Math.min(monitor.offsetWidth, monitor.offsetHeight) + "px";
  canvas.style.height = canvas.style.width;
  canvas.style.backgroundColor = "#2b2b2b";
  monitor.appendChild(canvas);
  canvas.style.left = 0.5 * (monitor.offsetWidth - canvas.offsetWidth) + "px";
  canvas.style.top = 0.5 * (monitor.offsetHeight - canvas.offsetHeight) + "px";
}

function main() {
  fetch(`http://127.0.0.1:8080/data`, {
    method: `POST`,
    body: `{"request": "getRoomData", "roomName": "W0N0"}`,
  })
    .then((response) => response.json())
    .then((json) => request(json));
}

function request(object) {
  if (cnt <= 3) {
    console.log(object);
    cnt++;
  }
  display.refresh(object);
}

function play(){
  display.play();
}

const QUEST_INTERVAL = 1000;
const REFRESH_INTERVAL = 16;
let cnt = 0;

initCanvas();
const display = new Display();
setInterval(main, QUEST_INTERVAL);
setInterval(play, REFRESH_INTERVAL);