function up_low_divline_move() {
  let is_drop = true;
  let divline = document.querySelector("#up-low-divline");
  let up_box = document.querySelector(".upper-monitor");
  let low_box = document.querySelector(".lower-monitor");
  window.onmouseup = function () {
    is_drop = false;
  };
  window.onmousemove = function (event) {
    if (is_drop) {
      divline.style.top = (100 * event.pageY) / window.innerHeight + "%";
      up_box.style.height = (100 * event.pageY) / window.innerHeight + "%";
      low_box.style.height = 100 * (1 - event.pageY / window.innerHeight) + "%";
    }
  };
}

function pixi_canvas_move() {
  let is_drop = true;
  let monitor = document.querySelector(".upper-left-monitor");
  let canvas = document.querySelector(".pixi-canvas");
  let x, y, dx, dy;
  let cx, cy;
  window.onmouseup = function () {
    is_drop = false;
  };
  window.onmousemove = function (event) {
    if (x === undefined) {
      x = event.pageX;
      y = event.pageY;
      cx = canvas.offsetLeft;
      cy = canvas.offsetTop;
    }
    if (is_drop) {
      dx = event.pageX - x;
      dy = event.pageY - y;
      canvas.style.left = cx + dx + "px";
      canvas.style.top = cy + dy + "px";
    }
  };
}

function pixi_canvas_zoom() {
  let canvas = document.querySelector(".pixi-canvas");
  let size = canvas.offsetWidth;
  if (event.wheelDelta > 0) {
    canvas.style.width = size / 0.9 + "px";
    canvas.style.height = size / 0.9 + "px";
  } else {
    canvas.style.width = size * 0.9 + "px";
    canvas.style.height = size * 0.9 + "px";
  }
}
