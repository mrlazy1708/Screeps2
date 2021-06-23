const BGD_COLOR = "#2b2b2b";
const WALL_COLOR = "#1d1d1d";
const SWAMP_COLOR = "#28301d";
const MARGIN_COLOR = "#222222";
const SOURCE_COLOR = "#f6e07b";
const SOURCE_LIGHT_COLOR = "#f6e07b";
const CONTROLLER_COLOR = "#66ccff";
const CREEP_COLOR = "#ffffff";
const SPAWN_COLOR = "#b22222";
const X_SIZE = 64;
const Y_SIZE = 64;
const QUEST_INTERVAL = 1000;
const REFRESH_INTERVAL = 16;
const ORIGIN_RES = 3000;
const SOURCE_SHINE_INTERVAL = 3000;
const BLOCK_SIZE = ORIGIN_RES / X_SIZE;
const MAP_SIZE_X = BLOCK_SIZE * X_SIZE;
const MAP_SIZE_Y = BLOCK_SIZE * Y_SIZE;

export class Display {
  constructor() {
    this.totalRefresh = true;
    this.timeAnchor = new Date();
    this.canvasElement = document.querySelector("#two-canvas");
    this.two = new Two({
      height: ORIGIN_RES,
      width: ORIGIN_RES,
      autostart: true,
    }).appendTo(this.canvasElement);
    this.two.scene.scale = this.canvasElement.offsetWidth / ORIGIN_RES;

    this.Terrain = new Object();
    this.Structure = new Object();
    this.Creep = new Object();

    this.two.update();
  }
  refreshCanvas() {
    if (this.Terrain.group != undefined) {
      this.Terrain.group.remove();
    }
    if (this.Structure.group != undefined) {
      this.Structure.group.remove();
    }
    if (this.Creep.group != undefined) {
      this.Creep.group.remove();
    }

    this.Terrain.group = new Two.Group().addTo(this.two.scene);
    this.Structure.group = new Two.Group().addTo(this.two.scene);
    this.Creep.group = new Two.Group().addTo(this.two.scene);

    this.Creep.map = new Map();
    this.Structure.map = new Map();
  }
  refreshTerrain(info) {
    this.Terrain.str = info.terrain;
    const terrain = _.map(info.terrain.split(`,`), (r) => r.split(``));
    _.forEach(terrain, (r) => (r.push(_.last(r)), r.unshift(_.head(r))));
    terrain.push(_.last(terrain)), terrain.unshift(_.head(terrain));

    const [X, Y] = [X_SIZE + 2, Y_SIZE + 2];

    // prettier-ignore
    const dudv = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    // prettier-ignore
    const dxdy = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

    const rad = 6;

    // prettier-ignore
    const corner = [[[0, 1], [-1, 1], [0, 0], [1, 1]],
                    [[-1, 1], [-1, 0], [-1, -1], [0, 0]],
                    [[0, 0], [-1, -1], [0, -1], [1, -1]],
                    [[1, 1], [0, 0], [1, -1], [1, 0]]],
      controlL = _.map(corner, (row) =>
        _.map(row, ([x, y]) => new Two.Vector(x * rad, y * rad))
      ),
      controlR = _.map(corner, (row) =>
        _.map(row, ([x, y]) => new Two.Vector(-x * rad, -y * rad))
      );

    // prettier-ignore
    const delta = [[null, 7, null, 1],
                   [3, null, 1, null],
                   [null, 5, null, 3],
                   [5, null, 7, null]];

    function strokeTerrain(group, on, fill, stroke) {
      const vis = _.map(Array(Y), () => Array(X).fill(false));
      function dfs1(x, y, c = y * X + x + 1) {
        vis[y][x] = c;
        _.forEach(dudv, ([du, dv]) => {
          const [u, v] = [x + du, y + dv];
          if (u < 0 || u >= X || v < 0 || v >= Y) return;
          if (vis[v][u] !== false || terrain[v][u] !== on) return;
          dfs1(u, v, c);
        });
      }
      const rdudv = _.filter(dxdy, (_, i) => i % 2),
        ldudv = _.initial(_.clone(rdudv)),
        ldr = _.zip((ldudv.unshift(_.last(rdudv)), ldudv), dudv, rdudv); // [[-1, -1], [0, -1], [1, -1]], [[1, -1], [1, 0], [1, 1]], [[1, 1], [0, 1], [-1, 1]], [[-1, 1], [-1, 0], [-1, -1]]]
      function dfs2(x, y, gis, c = y * X + x + 1, p = 0, path = null) {
        _.forEach(ldr, ([[lu, lv], [du, dv], [ru, rv]], i) => {
          const [u, v] = [x + du, y + dv];
          (lu = x - 0.5 + lu / 2), (lv = y - 0.5 + lv / 2);
          (ru = x - 0.5 + ru / 2), (rv = y - 0.5 + rv / 2);
          const vl = (vis[lv] || [])[lu] || false,
            vr = (vis[rv] || [])[ru] || false;
          if ((vl !== c) !== (vr !== c) && !gis[v][u]) {
            gis[v][u] = true;
            if (!_.isNull(path)) throw new Error(`Un-handled ${[x, y]}!`);
            const edge = new Two.Anchor(),
              [dx, dy] = dxdy[delta[p][i]] || [0, 0];
            edge.command = Two.Commands.curve;
            edge.x = (x - 1 - dx * 0.1) * BLOCK_SIZE;
            edge.y = (y - 1 - dy * 0.1) * BLOCK_SIZE;
            edge.controls.left = controlL[p][i];
            edge.controls.right = controlR[p][i];
            const anchor = new Two.Anchor();
            anchor.command = Two.Commands.curve;
            anchor.x = (x - 1 + du * 0.5) * BLOCK_SIZE;
            anchor.y = (y - 1 + dv * 0.5) * BLOCK_SIZE;
            path = dfs2(u, v, gis, c, i);
            path.unshift(anchor), path.unshift(edge);
          }
        });
        return path || [];
      }
      _.forEach(_.range(Y), (y) =>
        _.forEach(_.range(X), (x) => {
          if (terrain[y][x] === on && vis[y][x] === false) {
            const gis = _.map(Array(Y + 1), () => Array(X + 1)),
              points = (dfs1(x, y), dfs2(x, y, gis)),
              path = new Two.Path(points, true, false, true);
            path.linewidth = 6;
            path.fill = fill;
            path.stroke = stroke;
            group.add(path);
          }
        })
      );
    }

    strokeTerrain(this.Terrain.group, `~`, SWAMP_COLOR, `#292a21`);
    strokeTerrain(this.Terrain.group, `x`, WALL_COLOR, `#000000`);
    const mask = new Two.Path([
      new Two.Vector(0, 0),
      new Two.Vector(0, Y_SIZE * BLOCK_SIZE),
      new Two.Vector(X_SIZE * BLOCK_SIZE, Y_SIZE * BLOCK_SIZE),
      new Two.Vector(X_SIZE * BLOCK_SIZE, 0),
    ]);
    this.Terrain.group.add(mask);
    this.Terrain.group.mask = mask;
  }
  newSource(info) {
    let source = new Object();
    source.layer = new Array();
    source.layer.push(
      new Two.RoundedRectangle(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        0.8 * BLOCK_SIZE,
        0.8 * BLOCK_SIZE,
        0.15 * BLOCK_SIZE
      )
    );
    source.layer[0].fill = SOURCE_COLOR;
    source.layer[0].noStroke();
    this.Structure.group.add(source.layer[0]);
    source.layer.push(
      new Two.Circle(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        BLOCK_SIZE * 5
      )
    );
    source.layer[1].fill = this.two.makeRadialGradient(
      0,
      0,
      BLOCK_SIZE * 5,
      new Two.Stop(0, SOURCE_LIGHT_COLOR, 0.25),
      new Two.Stop(0.9, SOURCE_LIGHT_COLOR, 0)
    );
    source.layer[1].noStroke();
    this.Structure.group.add(source.layer[1]);
    return source;
  }
  newController(info) {
    let controller = new Object();
    controller.layer = new Array();
    controller.layer.push(
      new Two.Polygon(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        0.6 * BLOCK_SIZE,
        8
      )
    );
    controller.layer[0].fill = CONTROLLER_COLOR;
    controller.layer[0].noStroke();
    this.Structure.group.add(controller.layer[0]);
    return controller;
  }
  newSpawn(info) {
    let spawn = new Object();
    spawn.layer = new Array();
    spawn.layer.push(
      new Two.Circle(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        0.6 * BLOCK_SIZE
      )
    );
    spawn.layer[0].fill = SPAWN_COLOR;
    spawn.layer[0].noStroke();
    this.Structure.group.add(spawn.layer[0]);
    return spawn;
  }

  refreshStructure(info) {
    let structure;
    for (let str in info.structures) {
      switch (info.structures[str].structureType) {
        case "Source":
          if (this.Structure.map.has(str)) {
            let structure = this.Structure.map.get(str);
            structure.live = true;
          } else {
            structure = this.newSource(info.structures[str]);
            this.Structure.map.set(str, structure);
            structure.structureType = "Source";
            structure.live = true;
          }
          break;
        case "Controller":
          if (this.Structure.map.has(str)) {
            let structure = this.Structure.map.get(str);
            structure.live = true;
          } else {
            structure = this.newController(info.structures[str]);
            this.Structure.map.set(str, structure);
            structure.structureType = "Controller";
            structure.live = true;
          }
          break;
        case "Spawn":
          if (this.Structure.map.has(str)) {
            let structure = this.Structure.map.get(str);
            structure.live = true;
          } else {
            structure = this.newSpawn(info.structures[str]);
            this.Structure.map.set(str, structure);
            structure.structureType = "Spawn";
            structure.live = true;
          }
          break;
      }
    }
    for (let strPair of this.Structure.map) {
      if (strPair[1].live === false) {
        for (let layer of strPair[1].layer) {
          this.Structure.group.remove(layer);
        }
        this.Structure.delete(strPair[0]);
      } else {
        strPair[1].live = false;
      }
    }
  }
  newCreep(info) {
    let creep = new Object();
    creep.layer = new Array();
    creep.layer.push(
      new Two.Circle(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        0.5 * BLOCK_SIZE
      )
    );
    creep.layer[0].fill = CREEP_COLOR;
    creep.layer[0].noStroke();
    this.Creep.group.add(creep.layer[0]);
    creep.nextPos = [
      info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
      info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
    ];
    creep.deltaPos = [0, 0];
    return creep;
  }
  playCreep() {
    let t = 1 - (new Date() - this.timeAnchor) / 1000;
    for (let creep of this.Creep.map.values()) {
      const ratio = 1 / (1 + Math.exp((0.5 - t) * 10));
      creep.layer[0].translation.set(
        creep.nextPos[0] - ratio * creep.deltaPos[0],
        creep.nextPos[1] - ratio * creep.deltaPos[1]
      );
    }
  }
  playStructure() {
    let t = Math.abs(
      (new Date() % SOURCE_SHINE_INTERVAL) / SOURCE_SHINE_INTERVAL - 0.5
    );
    for (let structure of this.Structure.map.values()) {
      switch (structure.structureType) {
        case "Source":
          structure.layer[1].opacity = t;
          break;
      }
    }
  }
  refreshCreep(info) {
    let creep;
    for (let crp in info.creeps) {
      if (this.Creep.map.has(info.creeps[crp].id)) {
        creep = this.Creep.map.get(info.creeps[crp].id);
        creep.layer[0].translation.set(creep.nextPos[0], creep.nextPos[1]);
        creep.deltaPos = [
          info.creeps[crp].pos[0] * BLOCK_SIZE +
            BLOCK_SIZE / 2 -
            creep.nextPos[0],
          info.creeps[crp].pos[1] * BLOCK_SIZE +
            BLOCK_SIZE / 2 -
            creep.nextPos[1],
        ];
        creep.nextPos = [
          info.creeps[crp].pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
          info.creeps[crp].pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        ];
        creep.live = true;
      } else {
        creep = this.newCreep(info.creeps[crp]);
        this.Creep.map.set(info.creeps[crp].id, creep);
        creep.live = true;
      }
    }
    for (let crpPair of this.Creep.map) {
      if (crpPair[1].live === false) {
        for (let layer of crpPair[1].layer) {
          this.Creep.group.remove(layer);
        }
        this.Creep.map.delete(crpPair[0]);
      } else {
        crpPair[1].live = false;
      }
    }
  }
  refresh(info) {
    this.timeAnchor = new Date();
    if (info === undefined) {
      return;
    }
    if (this.Terrain.str != info.terrain) {
      this.totalRefresh = true;
    }
    if (this.totalRefresh) {
      this.refreshCanvas();

      this.refreshTerrain(info);
      this.refreshStructure(info);
      this.refreshCreep(info);
      this.totalRefresh = false;
    } else {
      this.refreshCreep(info);
      this.refreshStructure(info);
    }
  }
  play() {
    this.two.scene.scale = this.canvasElement.offsetWidth / ORIGIN_RES;
    if (this.totalRefresh) {
      return;
    }
    this.playCreep();
    this.playStructure();
  }
}
