const BGD_COLOR = "#2b2b2b";
const WALL_COLOR = "#131313";
const SWAMP_COLOR = "#28301d";
const MARGIN_COLOR = "#222222";
const SOURCE_COLOR = "#f6e07b";
const CONTROLLER_COLOR = "#66ccff";
const CREEP_COLOR = "#ffffff";
const X_SIZE = 64;
const Y_SIZE = 64;
const ORIGIN_RES = 1000;
const BLOCK_SIZE = ORIGIN_RES / X_SIZE;
const MAP_SIZE_X = BLOCK_SIZE * X_SIZE;
const MAP_SIZE_Y = BLOCK_SIZE * Y_SIZE;

export class Display {
  constructor() {
    this.totalRefresh = true;
    this.canvasElement = document.querySelector("#two-canvas");
    this.two = new Two({
      height: ORIGIN_RES,
      width: ORIGIN_RES,
      autostart: true,
    }).appendTo(this.canvasElement);

    this.Terrain = new Object();
    this.Structure = new Object();
    this.Creep = new Object();

    this.Terrain.group = new Two.Group().addTo(this.two.scene);
    this.Structure.group = new Two.Group().addTo(this.two.scene);
    this.Creep.group = new Two.Group().addTo(this.two.scene);

    this.two.update();
  }
  setScale(ratio) {
    this.two.scene.scale = ratio;
  }
  refreshTerrain(info) {
    const terrain = info.terrain.split(",");
    let block;
    for (let i = 0; i != X_SIZE; i++) {
      for (let j = 0; j != Y_SIZE; j++) {
        if (terrain[j][i] === "x") {
          block = new Two.Rectangle(
            i * BLOCK_SIZE,
            j * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
          block.fill = WALL_COLOR;
          block.noStroke();
          this.Terrain.group.add(block);
        } else if (terrain[j][i] === "~") {
          block = new Two.Rectangle(
            i * BLOCK_SIZE,
            j * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
          block.fill = SWAMP_COLOR;
          block.noStroke();
          this.Terrain.group.add(block);
        }
      }
    }
  }
  refreshSource(info) {
    let source = new Two.Rectangle(
      info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2 - 0.475 * BLOCK_SIZE,
      info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2 - 0.475 * BLOCK_SIZE,
      0.95 * BLOCK_SIZE,
      0.95 * BLOCK_SIZE
    );
    source.fill = SOURCE_COLOR;
    source.noStroke();
    this.Structure.group.add(source);
  }
  refreshController(info) {
    let controller = new Two.Circle(
      info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2 ,
      info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2 ,
      0.5 * BLOCK_SIZE
    );
    controller.fill = CONTROLLER_COLOR;
    controller.noStroke();
    this.Structure.group.add(controller);
  }
  refreshStructure(info) {
    for (let str in info.structures) {
      switch (info.structures[str].structureType) {
        case "Source":
          this.refreshSource(info.structures[str]);
          break;
        case "Controller":
          this.refreshController(info.structures[str]);
          break;
      }
    }
  }
  refreshCreep(info) {
    for (let crp in info.creeps) {
      let creep = new Two.Circle(
        info.creeps[crp].pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.creeps[crp].pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        0.5 * BLOCK_SIZE
      );
      creep.fill=CREEP_COLOR;
      creep.noStroke();
      this.Creep.group.add(creep);
    }
  }
  display(info) {
    if (info === undefined) {
      return;
    }
    this.setScale(this.canvasElement.offsetWidth/ORIGIN_RES);
    if (this.totalRefresh) {
      this.refreshTerrain(info);
      this.refreshStructure(info);
      this.refreshCreep(info);
      this.totalRefresh = false;
    } else {
      // this.refreshCreep(info);
    }
  }
}
