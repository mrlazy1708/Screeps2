/** @format */

const { Application, Container, Graphics, TextStyle, Text } = PIXI;

const BGD_COLOR = 0x2b2b2b;
const WALL_COLOR = 0x131313;
const SWAMP_COLOR = 0x28301d;
const MARGIN_COLOR = 0x222222;
const SOURCE_COLOR = 0xf6e07b;
const CONTROLLER_COLOR = 0x66ccff;
const CREEP_COLOR = 0xffffff;
const RESOLUTION = 1;
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
    this.refresh = true;

    this.app = new Application({
      width: window.outerWidth,
      height: window.outerHeight,
      resolution: RESOLUTION,
    });
    document.querySelector(".upper-left-monitor").appendChild(this.app.view);
    this.app.renderer.backgroundColor = MARGIN_COLOR;

    this.ticker = this.app.ticker;

    this.Terrain = new Object();
    this.Creep = new Object();
    this.Structure = new Object();
    this.Terrain.canvas = new Container();
    this.Creep.canvas = new Container();
    this.Structure.canvas = new Container();

    this.app.stage.addChild(this.Terrain.canvas);
    this.app.stage.addChild(this.Creep.canvas);
    this.app.stage.addChild(this.Structure.canvas);

    this.Terrain.background = new Graphics();
    this.Terrain.canvas.addChild(this.Terrain.background);
    this.Terrain.list = this.new_grid(this.Terrain.canvas);

    this.GameText = new Object();
    this.GameText.loading_text = new Text("loading...", alert_style);
    this.GameText.loading_text.position.set(
      (MAP_SIZE_X - this.GameText.loading_text.width) / 2,
      (MAP_SIZE_Y - this.GameText.loading_text.height) / 2
    );
  }
  new_grid(canvas) {
    const grid = new Array();
    for (let i = 0; i != X_SIZE; i++) {
      const row = new Array();
      for (let j = 0; j != Y_SIZE; j++) {
        const block = new Graphics();
        block.position.set(i * BLOCK_SIZE, j * BLOCK_SIZE);
        row.push(block);
        canvas.addChild(block);
      }
      grid.push(row);
    }
    return grid;
  }
  new_center_grid(canvas) {
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
        canvas.addChild(block);
      }
      grid.push(row);
    }
    return grid;
  }
  refresh_source(info) {
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
        0.95 * BLOCK_SIZE
      )
      .endFill();
    this.Structure.canvas.addChild(source);
    info.obj = source;
  }
  refresh_controller(info) {
    let controller = new Graphics();
    controller.position.set(
      info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
      info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2
    );
    controller
      .beginFill(CONTROLLER_COLOR)
      .drawCircle(0, 0, 0.5 * BLOCK_SIZE)
      .endFill();
    this.Structure.canvas.addChild(controller);
    info.obj = controller;
  }
  refresh_terrain(info) {
    this.Terrain.background
      .beginFill(BGD_COLOR)
      .drawRect(0, 0, MAP_SIZE_X, MAP_SIZE_Y)
      .endFill();

    let terrain = info.terrain.split(",");
    for (let i = 0; i != X_SIZE; i++) {
      for (let j = 0; j != Y_SIZE; j++) {
        let color = BGD_COLOR;
        if (terrain[i][j] === "x") {
          color = WALL_COLOR;
        } else if (terrain[i][j] === "~") {
          color = SWAMP_COLOR;
        }
        this.Terrain.list[j][i]
          .beginFill(color)
          .drawRect(0, 0, BLOCK_SIZE, BLOCK_SIZE, 5)
          .endFill();
      }
    }
  }
  refresh_structure(info) {
    this.Structure.info = info.structures;
    for (let str in this.Structure.info) {
      switch (this.Structure.info[str].structureType) {
        case "Source":
          this.refresh_source(this.Structure.info[str]);
          break;
        case "Controller":
          this.refresh_controller(this.Structure.info[str]);
          break;
      }
    }
  }
  refresh_creep(info) {
    this.Creep.info = info.creeps;
    for (let crp in info.creeps) {
      let creep = new Graphics();
      creep.position.set(
        info.creeps[crp].pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.creeps[crp].pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2
      );
      creep
        .beginFill(CREEP_COLOR)
        .drawCircle(0, 0, 0.5 * BLOCK_SIZE)
        .endFill();
      creep.info = info.creeps[crp];
      this.Creep.canvas.addChild(creep);
      this.Creep.info[crp].canvas = creep;
    }
  }
  frame(info) {
    for (let crp in info.creeps) {
      this.Creep.info[crp].canvas.position.set(
        info.creeps[crp].pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.creeps[crp].pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2
      );
    }
  }
  display(info) {
    if (this.refresh === true) {
      if (info === undefined) {
        this.app.stage.addChild(this.GameText.loading_text);
      } else {
        this.app.stage.removeChild(this.GameText.loading_text);
        this.refresh_terrain(info);
        this.refresh_structure(info);
        this.refresh_creep(info);
        this.refresh = false;
      }
    } else {
      this.frame(info);
    }
  }
}
