`use strict`;

import { WorldMap } from "./display.js";

const name = `Alice`,
  roomName = `W0N0`;

{
  const canvas = document.createElement(`div`);
  canvas.id = `two-canvas`;
  const size = Math.max(window.offsetWidth, window.offsetHeight);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.style.backgroundColor = "#2b2b2b";
  const left = 0.5 * (window.offsetWidth - size);
  canvas.style.left = `${left}px`;
  const top = 0.5 * (window.offsetHeight - size);
  canvas.style.top = `${top}px`;
  document.body.appendChild(canvas);
}

const REFRESH_INTERVAL = 16;
const worldMap = new WorldMap();
setInterval(() => worldMap.play(), REFRESH_INTERVAL);

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

const REQUEST_INTERVAL = 1000;
setInterval(
  () => data(`getRoomData`, { roomName }, worldMap.refresh.bind(worldMap)),
  REQUEST_INTERVAL
);
