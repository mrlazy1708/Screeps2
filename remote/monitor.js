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

const output = document.querySelector(`#console-output`);
const lines = [...output.children];
let cnt = lines.length;
function consoleOutput(stamp, message) {
  const line = document.createElement(`div`);
  line.className = `console-output-line`;
  line.id = `console-output-line-${cnt}`;
  output.appendChild(line), lines.push(line);
  if (lines.length > 100) {
    const overflow = lines.shift();
    overflow.remove();
  }
  {
    const lineStamp = document.createElement(`div`);
    lineStamp.className = `console-output-line-stamp`;
    lineStamp.id = `console-output-line-stamp-${cnt}`;
    lineStamp.textContent = stamp;
    line.appendChild(lineStamp);
    const lineMessage = document.createElement(`div`);
    lineMessage.className = `console-output-line-message`;
    lineMessage.id = `console-output-line-stamp-${cnt}`;
    lineMessage.textContent = message;
    line.appendChild(lineMessage);
  }
  cnt++;
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
