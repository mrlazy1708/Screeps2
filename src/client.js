`use strict`;

function on_drag_start(event) {
    this.anchor = event.data.getLocalPosition(this);
}
function on_dragging(event) {
    if (this.anchor) {
        let global_position = event.data.getLocalPosition(this.parent);
        this.x = global_position.x - this.anchor.x;
        this.y = global_position.y - this.anchor.y;
    }
}
function on_drag_end(_event) {
    delete this.anchor;
}
module.exports.pixi_ = function (parent, drag = false) {
    const container = new PIXI.Container();
    parent.stage.addChild(container);
    container.interactive = drag;
    Object.setPrototypeOf(this, container);

    this.on(`pointerdown`, on_drag_start)
        .on(`pointermove`, on_dragging)
        .on(`pointerup`, on_drag_end)
        .on(`pointerupoutside`, on_drag_end);
};
