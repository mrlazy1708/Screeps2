function upLowDivlineMove(event) {
  let mouseDown = true;
  const divline = document.querySelector("#up-low-divline");
  const upBox = document.querySelector("#upper-monitor");
  const lowBox = document.querySelector("#lower-monitor");
  window.onmouseup = () => (mouseDown = false);
  window.onmousemove = function (event) {
    if (mouseDown) {
      const boxY = Math.min(
        Math.max(event.pageY, window.outerHeight * 0.6),
        window.outerHeight * 0.7
      );
      divline.style.top = `${(100 * boxY) / window.innerHeight}%`;
      upBox.style.height = `${(100 * boxY) / window.innerHeight}%`;
      lowBox.style.height = `${100 * (1 - boxY / window.innerHeight)}%`;
    }
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
  let mouseDown = true;
  const upBox = document.querySelector("#upper-left-monitor");
  const canvas = document.querySelector("#two-canvas");
  const [mouseX0, mouseY0] = [event.pageX, event.pageY],
    [canvasX0, canvasY0] = [canvas.offsetLeft, canvas.offsetTop];
  window.onmouseup = function () {
    mouseDown = false;
    clamp(upBox, canvas);
  };
  window.onmousemove = function (event) {
    if (mouseDown) {
      canvas.style.left = `${canvasX0 + event.pageX - mouseX0}px`;
      canvas.style.top = `${canvasY0 + event.pageY - mouseY0}px`;
    }
  };
}

function twoCanvasZoom(event) {
  const upBox = document.querySelector("#upper-left-monitor");
  const canvas = document.querySelector("#two-canvas");
  const [mouseX, mouseY] = [event.pageX, event.pageY],
    ratioX = (mouseX - canvas.offsetLeft) / canvas.offsetWidth,
    ratioY = (mouseY - canvas.offsetTop) / canvas.offsetHeight;
  let size = canvas.offsetWidth * (event.wheelDelta > 0 ? 1 / 0.95 : 0.95);
  size = Math.max(Math.min(size, 3000), 40);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.style.left = `${mouseX - ratioX * size}px`;
  canvas.style.top = `${mouseY - ratioY * size}px`;
  clamp(upBox, canvas);
}

function consoleOutput(stamp, message) {
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
    lineMessage.textContent = message;
    line.appendChild(lineMessage);
  }
}

function consoleInput(element, event) {
  if (event.keyCode === 13) {
    consoleOutput(`[${new Date().toJSON()}]:`, `${element.value.slice(2)}\n`);
    element.value = "> ";
  } else if (event.keyCode === 8 && element.value === "> ") {
    event.returnValue = false;
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
      break;
  }
}

function initMonitor() {
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

function initEditor() {
  const editor = ace.edit("codeEditor");
  const theme = "tomorrow_night";
  const language = "javascript";
  editor.setTheme("ace/theme/" + theme);
  editor.session.setMode("ace/mode/" + language);
  editor.setFontSize(12);
  editor.setReadOnly(false);
  editor.session.setTabSize(2);
  editor.setShowPrintMargin(false);
  data(`getScript`, {}, (json) => editor.setValue(json));
}

function data(request, opts, callback = () => {}) {
  const name = window.sessionStorage.getItem(`name`) || ``,
    pass = window.sessionStorage.getItem(`pass`) || ``,
    body = { auth: { name, pass }, request },
    origin = `${window.location.protocol}//${window.location.host}`;
  fetch(`${origin}/data`, {
    method: `POST`,
    body: JSON.stringify(Object.assign(body, opts)),
  })
    .then((response) => response.json())
    .then((json) => {
      if (json === `Error: Not Available` || json === `Error: Not Found`) {
        window.sessionStorage.setItem(`prev`, window.location.href);
        window.location.replace(`${origin}/login`);
      } else return json;
    })
    .then((json) => callback(json));
}
