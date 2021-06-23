"use strict";

import { Display } from "./display.js";
import { twoCanvasMove, twoCanvasZoom, switchWindow } from "./monitor.js";

let stat = `login`,
  name = undefined,
  pass = undefined;

function initMonitor() {
  {
    const upperMonitor = document.createElement(`div`);
    upperMonitor.id = `upper-monitor`;
    {
      const upperLeftMonitor = document.createElement(`div`);
      upperLeftMonitor.id = `upper-left-monitor`;
      upperLeftMonitor.onmousedown = twoCanvasMove;
      upperLeftMonitor.onmousewheel = twoCanvasZoom;
    }
    {
      const upperRightMonitor = document.createElement(`div`);
      upperRightMonitor.id = `upper-right-monitor`;
    }
  }
  {
    const upLowDivLine = document.createElement(`div`);
    upLowDivLine.id = `up-low-div-line`;
    upLowDivLine.onmouseover = () => (this.style.opacity = `0.3`);
    upLowDivLine.onmouseout = () => (this.style.opacity = `0.0`);
    upLowDivLine.onmousedown = upLowDivlineMove;
  }
  {
    const lowerMonitor = document.createElement(`div`);
    lowerMonitor.id = `lower-monitor`;
    {
      const monitorMenu = document.createElement(`div`);
      monitorMenu.id = `monitor-menu`;
      {
        const scriptTag = document.createElement(`div`);
        scriptTag.textContent = `Script`;
        scriptTag.id = `script-tag`;
        scriptTag.style = `position:relative;width:70px;height:25px;text-align:center;float:left;`;
        scriptTag.onmouseover = () => (this.style.backgroundColor = `#666666`);
        scriptTag.onmouseout = () => (this.style.backgroundColor = `#424242`);
        scriptTag.onmousedown = () => switchWindow(`script`);
      }
      {
        const consoleTag = document.createElement(`div`);
        consoleTag.textContent = `Console`;
        consoleTag.id = `console-tag`;
        consoleTag.style = `position:relative;width:70px;height:25px;text-align:center;float:left;`;
        consoleTag.onmouseover = () => (this.style.backgroundColor = `#666666`);
        consoleTag.onmouseout = () => (this.style.backgroundColor = `#424242`);
        consoleTag.onmousedown = () => switchWindow(`console`);
      }
    }
    {
      // continue to window(s)
    }
  }
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

function initLogin() {
  const loginForm = document.createElement(`div`);
  document.body.appendChild(loginForm);
  {
    const labelName = document.createElement(`label`);
    labelName.textContent = `Name: `;
    loginForm.appendChild(labelName);
    {
      const inputName = document.createElement(`input`);
      inputName.id = `input-name`;
      inputName.type = `text`;
      inputName.style = `display:block`;
      labelName.appendChild(inputName);
    }
  }
  {
    const labelPassword = document.createElement(`label`);
    labelPassword.textContent = `Password: `;
    loginForm.appendChild(labelPassword);
    {
      const inputPassword = document.createElement(`input`);
      inputPassword.id = `input-password`;
      inputPassword.type = `password`;
      inputPassword.style = `display:block`;
      labelPassword.appendChild(inputPassword);
    }
  }
}

function auth(name, pass, request) {
  const body = {
    auth: { name, pass },
    request: request,
  };
  fetch(`http://127.0.0.1:8080/auth`, {
    method: `POST`,
    body: JSON.stringify(body),
  })
    .then((response) => response.json())
    .then((json) => {
      console.log(json, json === `OK`);
    });
}

function data(roomName) {
  const body = {
    auth: { name },
    request: `getRoomData`,
    roomName: `W0N0`,
  };
  fetch(`http://127.0.0.1:8080/data`, {
    method: `POST`,
    body: JSON.stringify(body),
  })
    .then((response) => response.json())
    .then((json) => display.refresh(json));
}

const REQUEST_INTERVAL = 1000;
const REFRESH_INTERVAL = 16;

// initCanvas();
// setInterval(main, REQUEST_INTERVAL);

// const display = new Display();
// setInterval(() => display.play(), REFRESH_INTERVAL);

initLogin();
