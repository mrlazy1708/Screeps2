/** @format */

const { Application, Container, Graphics, TextStyle, Text } = PIXI;

const BGD_COLOR = 0x555555;
const STONE_COLOR = 0x222222;
const SWAMP_COLOR = 0x2f4f4f;
const MARGIN_COLOR = 0x222222;
const SOURCE_COLOR = 0xffd700;
const CONTRPLLER_COLOR = 0xffffff;
const RESOLUTION = 3;
const X_SIZE = 64;
const Y_SIZE = 64;
const BLOCK_SIZE = Math.min(
  window.outerWidth / X_SIZE,
  window.outerHeight / Y_SIZE
);
const MAP_SIZE_X = BLOCK_SIZE * X_SIZE;
const MAP_SIZE_Y = BLOCK_SIZE * Y_SIZE;
const alert_style = new TextStyle({
  fontFamily: "Consolas",
  fontSize: 20,
  fill: "white",
  fontWeight: "normal",
});

export class Display {
  constructor() {
    this.init_over = false;
    this.app = new Application({
      width: window.outerWidth,
      height: window.outerHeight,
      resolution: RESOLUTION,
    });
    document.body.appendChild(this.app.view);
    this.app.renderer.backgroundColor = MARGIN_COLOR;

    this.main_map = new Container();
    this.creeps = new Container();
    this.structures = new Container();
    this.map_bgd = new Graphics();
    this.main_map.addChild(this.map_bgd);
    this.app.stage.addChild(this.main_map);
    this.app.stage.addChild(this.creeps);
    this.app.stage.addChild(this.structures);
    this.ticker = this.app.ticker;

    this.terrain_blocks = this.new_grid();
    this.structure_blocks = new Array();
    this.creep_list = new Array();

    this.text = new Text("loading...", alert_style);
    let x = (MAP_SIZE_X - this.text.width) / 2;
    let y = (MAP_SIZE_Y - this.text.height) / 2;
    this.text.position.set(x, y);
  }
  draw_terrain(info) {
    this.map_bgd
      .beginFill(BGD_COLOR)
      .drawRect(0, 0, MAP_SIZE_X, MAP_SIZE_Y)
      .endFill();

    let terrain = info.terrain.split(",");
    for (let i = 0; i != X_SIZE; i++) {
      for (let j = 0; j != Y_SIZE; j++) {
        let color = BGD_COLOR;
        if (terrain[i][j] === "x") {
          color = STONE_COLOR;
        } else if (terrain[i][j] === "~") {
          color = SWAMP_COLOR;
        }
        this.terrain_blocks[j][i]
          .beginFill(color)
          .drawRect(0, 0, BLOCK_SIZE, BLOCK_SIZE, 5)
          .endFill();
      }
    }
  }
  draw_source(info) {
    let source = new Graphics();
    source.position.set(
      info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
      info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2
    );
    source
      .beginFill(SOURCE_COLOR)
      .drawRect(
        -0.475 * BLOCK_SIZE,
        -0.475 * BLOCK_SIZE,
        0.95 * BLOCK_SIZE,
        0.95 * BLOCK_SIZE,
      )
      .endFill();
    this.structures.addChild(source);
  }
  draw_controller(info) {
    let controller = new Graphics();
    controller.position.set(
      info["pos"][0] * BLOCK_SIZE + BLOCK_SIZE / 2,
      info["pos"][1] * BLOCK_SIZE + BLOCK_SIZE / 2
    );
    controller
      .beginFill(CONTRPLLER_COLOR)
      .drawCircle(0, 0, 0.5 * BLOCK_SIZE)
      .endFill();
    this.structures.addChild(controller);
  }
  draw_structures(info) {
    let structures = info.structures;
    this.structure_blocks=info.structures;
    for (let str in structures) {
      switch (structures[str].structureType) {
        case "Source":
          this.draw_source(structures[str]);
          break;
        case "Controller":
          this.draw_controller(structures[str]);
          break;
      }
    }
  }
  draw_creeps(info){
    let creeps=info.creeps;
    for (let crp in creeps) {
      this.creep_list.push(creep[crp]);
    }
  }
  new_grid() {
    const grid = new Array();
    for (let i = 0; i != X_SIZE; i++) {
      const row = new Array();
      for (let j = 0; j != Y_SIZE; j++) {
        const block = new Graphics();
        block.position.set(i * BLOCK_SIZE, j * BLOCK_SIZE);
        row.push(block);
        this.main_map.addChild(block);
      }
      grid.push(row);
    }
    return grid;
  }
  new_center_grid() {
    const grid = new Array();
    for (let i = 0; i != X_SIZE; i++) {
      const row = new Array();
      for (let j = 0; j != Y_SIZE; j++) {
        const block = new Graphics();
        block.position.set(
          i * BLOCK_SIZE + BLOCK_SIZE / 2,
          j * BLOCK_SIZE + BLOCK_SIZE / 2
        );
        row.push(block);
        this.main_map.addChild(block);
      }
      grid.push(row);
    }
    return grid;
  }
  display(info) {
    if (this.init_over === false) {
      if (info === undefined) {
        this.main_map.addChild(this.text);
      } else {
        this.main_map.removeChild(this.text);
        this.draw_terrain(info);
        this.draw_structures(info);
        this.init_over = true;
      }
    }
  }
}
