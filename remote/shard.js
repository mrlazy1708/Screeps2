`use strict`;

import { ShardMap } from "./display.js";

const name = `Alice`;
const SHARD_SIZE = 1;

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

const REFRESH_INTERVAL = 16;
const shardMap = new ShardMap();
setInterval(() => shardMap.play(), REFRESH_INTERVAL);

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

for (let i = -SHARD_SIZE; i < SHARD_SIZE; i++) {
  for (let j = -SHARD_SIZE; j < SHARD_SIZE; j++) {
    const roomName =
      `${i >= 0 ? `E${i}` : `W${-1 - i}`}` +
      `${j >= 0 ? `S${j}` : `N${-1 - j}`}`;
    data(
      `getRoomData`,
      { roomName },
      shardMap.refresh.bind(shardMap, roomName)
    );
  }
}

{
  const canvas = document.querySelector("#two-canvas");
  canvas.onmousemove = function (event) {
    shardMap.mouseSelector(
      (event.pageX - canvas.offsetLeft) / canvas.offsetWidth,
      (event.pageY - canvas.offsetTop) / canvas.offsetHeight
    );
  };
}
