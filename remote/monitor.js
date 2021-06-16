function upLowDivlineMove(event) {
  let mouseDown = true;
  let divline = document.querySelector("#up-low-divline");
  let up_box = document.querySelector(".upper-monitor");
  let low_box = document.querySelector(".lower-monitor");
  window.onmouseup = () => (mouseDown = false);
  window.onmousemove = function (event) {
    if (mouseDown) {
      divline.style.top = `${(100 * event.pageY) / window.innerHeight}%`;
      up_box.style.height = `${(100 * event.pageY) / window.innerHeight}%`;
      low_box.style.height = `${100 * (1 -( event.pageY / window.innerHeight))}%`;
    }
  };
}

function pixiCanvasMove(event) {
  let mouseDown = true;
  let canvas = document.querySelector(".pixi-canvas");
  let [mouseX0, mouseY0] = [event.pageX, event.pageY],
    [canvasX0, canvasY0] = [canvas.offsetLeft, canvas.offsetTop];
  window.onmouseup = () => (mouseDown = false);
  window.onmousemove = function (event) {
    if (mouseDown) {
      canvas.style.left = `${canvasX0 + event.pageX - mouseX0}px`;
      canvas.style.top = `${canvasY0 + event.pageY - mouseY0}px`;
    }
  };
}

function pixiCanvasZoom(event) {
  const canvas = document.querySelector(".pixi-canvas");
  const size = canvas.offsetWidth * (event.wheelDelta > 0 ? 1 / 0.9 : 0.9),
    [mouseX, mouseY] = [event.pageX, event.pageY],
    ratioX = (mouseX - canvas.offsetLeft) / canvas.offsetWidth,
    ratioY = (mouseY - canvas.offsetTop) / canvas.offsetHeight;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.style.left = `${mouseX - ratioX * size}px`;
  canvas.style.top = `${mouseY - ratioY * size}px`;
}
