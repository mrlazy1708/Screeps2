function twoCanvasMove(event) {
  let mouseDown = true;
  const upBox = document.body;
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
  const upBox = document.body;
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
