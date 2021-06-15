function up_low_divline_move() {
  let is_drop = true;
  let divline = document.querySelector("#divline");
  let up_box = document.querySelector(".upper-monitor");
  let low_box = document.querySelector(".lower-monitor");
  window.onmouseup = function () {
    is_drop = false;
  };
  window.onmousemove = function (event) {
    if (is_drop) {
      divline.style.top = event.pageY + "px";
      up_box.style.height = 100*event.pageY/window.innerHeight + "%";
      low_box.style.height = 100*(1-event.pageY/window.innerHeight) + "%";
    }
  };
}
