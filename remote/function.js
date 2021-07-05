function upLowDivlineMove(event) {
  const upBox = document.querySelector("#upper-monitor");
  const lowBox = document.querySelector("#lower-monitor"),
    editor = ace.edit("codeEditor");
  const [mouseY0, divY0] = [event.pageY, lowBox.offsetTop];
  window.onmouseup = () => (window.onmousemove = () => {});
  window.onmousemove = function (event) {
    const newY = divY0 + event.pageY - mouseY0,
      divY = Math.min(Math.max(newY, 0), window.innerHeight);
    upBox.style.height = `${divY}px`;
    lowBox.style.height = `${window.innerHeight - divY}px`;
    editor.resize();
  };
}

function clamp(upBox, canvas) {
  const canvasX = canvas.offsetLeft,
    lowerX = -canvas.offsetWidth * 0.9,
    upperX = upBox.offsetWidth - canvas.offsetWidth * 0.1;
  canvas.style.left = `${Math.max(Math.min(canvasX, upperX), lowerX)}px`;
  const canvasY = canvas.offsetTop,
    lowerY = -canvas.offsetHeight * 0.9,
    upperY = upBox.offsetHeight - canvas.offsetHeight * 0.1;
  canvas.style.top = `${Math.max(Math.min(canvasY, upperY), lowerY)}px`;
}

function twoCanvasMove(event) {
  let = true;
  const upBox = document.querySelector("#upper-left-monitor");
  const canvas = document.querySelector("#two-canvas");
  const borderWidth = 50;
  const [mouseX0, mouseY0] = [event.pageX, event.pageY],
    [canvasX0, canvasY0] = [canvas.offsetLeft, canvas.offsetTop];
  window.onmouseup = function () {
    window.onmousemove = () => {};
    clamp(upBox, canvas);
    // prettier-ignore
    setCanvasButton(canvas.offsetTop-borderWidth, canvas.offsetLeft, canvas.offsetWidth, borderWidth, `up`);
    // prettier-ignore
    setCanvasButton(canvas.offsetTop+canvas.offsetHeight, canvas.offsetLeft, canvas.offsetWidth, borderWidth, `down`);
    // prettier-ignore
    setCanvasButton(canvas.offsetTop, canvas.offsetLeft-borderWidth, borderWidth, canvas.offsetHeight, `left`);
    // prettier-ignore
    setCanvasButton(canvas.offsetTop, canvas.offsetLeft+canvas.offsetWidth, borderWidth, canvas.offsetHeight, `right`);
  };
  window.onmousemove = function (event) {
    canvas.style.left = `${canvasX0 + event.pageX - mouseX0}px`;
    canvas.style.top = `${canvasY0 + event.pageY - mouseY0}px`;
    // prettier-ignore
    setCanvasButton(canvas.offsetTop-borderWidth, canvas.offsetLeft, canvas.offsetWidth, borderWidth, `up`);
    // prettier-ignore
    setCanvasButton(canvas.offsetTop+canvas.offsetHeight, canvas.offsetLeft, canvas.offsetWidth, borderWidth, `down`);
    // prettier-ignore
    setCanvasButton(canvas.offsetTop, canvas.offsetLeft-borderWidth, borderWidth, canvas.offsetHeight, `left`);
    // prettier-ignore
    setCanvasButton(canvas.offsetTop, canvas.offsetLeft+canvas.offsetWidth, borderWidth, canvas.offsetHeight, `right`);
  };
}

function twoCanvasZoom(event) {
  const upBox = document.querySelector("#upper-left-monitor");
  const canvas = document.querySelector("#two-canvas");
  const borderWidth = 50;
  const [mouseX, mouseY] = [event.pageX, event.pageY],
    ratioX = (mouseX - canvas.offsetLeft) / canvas.offsetWidth,
    ratioY = (mouseY - canvas.offsetTop) / canvas.offsetHeight;
  let size = canvas.offsetWidth * (event.wheelDelta > 0 ? 1 / 0.95 : 0.95);
  size = Math.max(Math.min(size, 3000), 300);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.style.left = `${mouseX - ratioX * size}px`;
  canvas.style.top = `${mouseY - ratioY * size}px`;
  clamp(upBox, canvas);
  // prettier-ignore
  setCanvasButton(canvas.offsetTop-borderWidth, canvas.offsetLeft, canvas.offsetWidth, borderWidth, `up`);
  // prettier-ignore
  setCanvasButton(canvas.offsetTop+canvas.offsetHeight, canvas.offsetLeft, canvas.offsetWidth, borderWidth, `down`);
  // prettier-ignore
  setCanvasButton(canvas.offsetTop, canvas.offsetLeft-borderWidth, borderWidth, canvas.offsetHeight, `left`);
  // prettier-ignore
  setCanvasButton(canvas.offsetTop, canvas.offsetLeft+canvas.offsetWidth, borderWidth, canvas.offsetHeight, `right`);
}

function consoleInput(element, event) {
  if (event.keyCode === 13) {
    consoleOutput(`[${new Date().toJSON()}]:`, `${element.value}\n`);
  } else if (event.keyCode === 8 && element.value === "> ") {
    event.returnValue = false;
  }
}

function getXY(roomName) {
  const [__, qx, nx, qy, ny] = /([WE])(\d+)([NS])(\d+)/.exec(roomName),
    Y = qy === `N` ? -1 - Number(ny) : Number(ny),
    X = qx === `W` ? -1 - Number(nx) : Number(nx);
  return [X, Y]; // wtf you modified
}

function getName(X, Y) {
  const nameX = `${X >= 0 ? `E${X}` : `W${-1 - X}`}`,
    nameY = `${Y >= 0 ? `S${Y}` : `N${-1 - Y}`}`;
  return nameX + nameY;
}

function consoleOutput(stamp, message, color) {
  const output = document.querySelector(`#console-output`),
    lines = [...output.children],
    line = document.createElement(`div`),
    index = new Date().toJSON();
  line.className = `console-output-line`;
  line.id = `console-output-line-${index}`;
  output.appendChild(line), lines.push(line);
  if (lines.length > 100) {
    const overflow = lines.shift();
    overflow.remove();
  }
  {
    const lineStamp = document.createElement(`div`);
    lineStamp.className = `console-output-line-stamp`;
    lineStamp.id = `console-output-line-stamp-${index}`;
    lineStamp.textContent = stamp;
    line.appendChild(lineStamp);
    const lineMessage = document.createElement(`div`);
    lineMessage.className = `console-output-line-message`;
    lineMessage.id = `console-output-line-stamp-${index}`;
    lineMessage.style.color = color;
    lineMessage.textContent = message;
    line.appendChild(lineMessage);
  }
}

function switchWindow(tag) {
  const consoleInput = document.querySelector("#console-input");
  const consoleWindow = document.querySelector("#console-window");
  const scriptWindow = document.querySelector("#codeEditor");
  switch (tag) {
    case "script":
      consoleInput.disabled = true;
      consoleWindow.style.display = "none";
      scriptWindow.style.display = "inline";
      break;
    case "console":
      consoleInput.disabled = false;
      consoleWindow.style.display = "inline";
      scriptWindow.style.display = "none";
      const editor = ace.edit("codeEditor");
      data(`setScript`, { script: editor.getValue() });
      break;
  }
}

async function initMonitor() {
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

async function initCanvasButton() {
  const monitor = document.querySelector("#upper-left-monitor"),
    canvas = document.querySelector("#two-canvas");
  const borderWidth = 50;
  // prettier-ignore
  createCanvasButton(monitor, canvas.offsetTop-borderWidth, canvas.offsetLeft, canvas.offsetWidth, borderWidth, `up`);
  // prettier-ignore
  createCanvasButton(monitor, canvas.offsetTop+canvas.offsetHeight, canvas.offsetLeft, canvas.offsetWidth, borderWidth, `down`);
  // prettier-ignore
  createCanvasButton(monitor, canvas.offsetTop, canvas.offsetLeft-borderWidth, borderWidth, canvas.offsetHeight, `left`);
  // prettier-ignore
  createCanvasButton(monitor, canvas.offsetTop, canvas.offsetLeft+canvas.offsetWidth, borderWidth, canvas.offsetHeight, `right`);
}
async function createCanvasButton(parent, top, left, width, height, suffix) {
  const button = document.createElement(`div`);
  const SHARD_SIZE = 3; // wtf
  button.id = `canvas-button-${suffix}`;
  button.style.zIndex = "4";
  button.style.position = `absolute`;
  button.style.left = `${left}px`;
  button.style.top = `${top}px`;
  button.style.width = `${width}px`;
  button.style.height = `${height}px`;
  button.style.backgroundColor = `white`;
  button.style.opacity = 0;
  button.onmouseover = function (event) {
    button.style.opacity = 0.1;
  };
  button.onmouseout = function (event) {
    button.style.opacity = 0;
  };
  button.ondblclick = function (event) {
    const roomName = window.sessionStorage.getItem(`room`);
    if (!roomName) return;
    let [x, y] = getXY(roomName);
    switch (suffix) {
      case "up":
        y--;
        break;
      case "down":
        y++;
        break;
      case "left":
        x--;
        break;
      case "right":
        x++;
        break;
    }
    if (x < -SHARD_SIZE || x >= SHARD_SIZE) return;
    if (y < -SHARD_SIZE || y >= SHARD_SIZE) return;
    window.sessionStorage.setItem("room", getName(x, y));
  };
  parent.appendChild(button);
}

async function setCanvasButton(top, left, width, height, suffix) {
  const button = document.querySelector("#canvas-button-" + suffix);
  if (!button) return;
  button.style.left = `${left}px`;
  button.style.top = `${top}px`;
  button.style.width = `${width}px`;
  button.style.height = `${height}px`;
}

async function initEditor() {
  const editor = ace.edit("codeEditor");
  const theme = "tomorrow_night";
  const language = "javascript";
  editor.setTheme("ace/theme/" + theme);
  editor.session.setMode("ace/mode/" + language);
  editor.setFontSize(12);
  editor.setReadOnly(false);
  editor.session.setTabSize(2);
  editor.setShowPrintMargin(false);
  editor.setValue(await data(`getScript`));
}

async function data(request, opts = {}) {
  const name = window.sessionStorage.getItem(`name`) || ``,
    pass = window.sessionStorage.getItem(`pass`) || ``,
    body = { auth: { name, pass }, request },
    origin = `${window.location.protocol}//${window.location.host}`;
  console.log(name);
  const json = await fetch(`${origin}/data`, {
    method: `POST`,
    body: JSON.stringify(Object.assign(body, opts)),
  })
    .then((response) => response.json())
    .catch(() => console.log(`do some off-line stuff`));
  if (json === `Error: Not Available`) {
    window.sessionStorage.setItem(`prev`, window.location.href);
    window.location.replace(`${origin}/login`);
  }
  return json;
}

const toShard = () => {
  const origin = `${window.location.protocol}//${window.location.host}`;
  window.location.replace(`${origin}/shard`);
};
