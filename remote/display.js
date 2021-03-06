const BGD_COLOR = "#2b2b2b";
const WALL_COLOR = "#1e1e1e";
const SWAMP_COLOR = "#28301d";
const MARGIN_COLOR = "#222222";
const SOURCE_COLOR = "#f6e07b";
const SOURCE_LIGHT_COLOR = "#f6e07b";
const CONTROLLER_COLOR = "#66ccff";
const CREEP_COLOR = "#ffffff";
const SPAWN_COLOR = "#b22222";
const WHITE = "#ffffff";
const X_SIZE = 64;
const Y_SIZE = 64;
const QUEST_INTERVAL = 1000;
const REFRESH_INTERVAL = 16;
const ORIGIN_RES = 3000;
const SOURCE_SHINE_INTERVAL = 3000;
const BLOCK_SIZE = ORIGIN_RES / X_SIZE;
const MAP_SIZE_X = BLOCK_SIZE * X_SIZE;
const MAP_SIZE_Y = BLOCK_SIZE * Y_SIZE;
const SHARD_SIZE = 3;
const ROOM_SIZE = ORIGIN_RES / (2 * SHARD_SIZE);
const TINY_BLOCKSIZE = ORIGIN_RES / (2 * SHARD_SIZE * X_SIZE);

function getXY(roomName) {
  const [__, qx, nx, qy, ny] = /([WE])(\d+)([NS])(\d+)/.exec(roomName),
    Y = qy === `N` ? -1 - Number(ny) : Number(ny),
    X = qx === `W` ? -1 - Number(nx) : Number(nx);
  return [X + SHARD_SIZE, Y + SHARD_SIZE];
}

function getName(X, Y) {
  const nameX = `${X >= 0 ? `E${X}` : `W${-1 - X}`}`,
    nameY = `${Y >= 0 ? `S${Y}` : `N${-1 - Y}`}`;
  return nameX + nameY;
}

class Source {
  constructor(canvas, info, two) {
    this.layer = new Array();
    this.structureType = "Source";
    this.layer.push(
      new Two.RoundedRectangle(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        0.8 * BLOCK_SIZE,
        0.8 * BLOCK_SIZE,
        0.15 * BLOCK_SIZE
      )
    );
    this.layer[0].fill = SOURCE_COLOR;
    this.layer[0].noStroke();
    canvas.add(this.layer[0]);
    this.layer.push(
      new Two.Circle(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        BLOCK_SIZE * 5
      )
    );
    this.layer[1].fill = two.makeRadialGradient(
      0,
      0,
      BLOCK_SIZE * 5,
      new Two.Stop(0, SOURCE_LIGHT_COLOR, 0.25),
      new Two.Stop(0.9, SOURCE_LIGHT_COLOR, 0)
    );
    this.layer[1].noStroke();
    canvas.add(this.layer[1]);
  }
  delLayer(canvas) {
    for (let layer of this.layer) {
      canvas.remove(layer);
    }
  }
  play() {
    this.layer[1].opacity = Math.abs(
      (new Date() % SOURCE_SHINE_INTERVAL) / SOURCE_SHINE_INTERVAL - 0.5
    );
  }
}

class Controller {
  constructor(canvas, info) {
    this.layer = new Array();
    this.structureType = "Controller";
    this.layer.push(
      new Two.Polygon(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        0.6 * BLOCK_SIZE,
        8
      )
    );
    this.layer[0].fill = CONTROLLER_COLOR;
    this.layer[0].noStroke();
    canvas.add(this.layer[0]);
  }
  delLayer(canvas) {
    for (let layer of this.layer) {
      canvas.remove(layer);
    }
  }
}

class Spawn {
  constructor(canvas, info) {
    this.layer = new Array();
    this.structureType = "Spawn";
    this.layer.push(
      new Two.Circle(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        0.6 * BLOCK_SIZE
      )
    );
    this.layer[0].fill = SPAWN_COLOR;
    this.layer[0].noStroke();
    canvas.add(this.layer[0]);
  }
  delLayer(canvas) {
    for (let layer of this.layer) {
      canvas.remove(layer);
    }
  }
}

class Creep {
  constructor(canvas, info) {
    this.layer = new Array();
    this.layer.push(
      new Two.Circle(
        info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
        info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
        0.5 * BLOCK_SIZE
      )
    );
    this.layer[0].fill = CREEP_COLOR;
    this.layer[0].noStroke();
    canvas.add(this.layer[0]);
    this.nextPos = [
      info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
      info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
    ];
    this.deltaPos = [0, 0];
  }
  refreshPos(info) {
    this.layer[0].translation.set(this.nextPos[0], this.nextPos[1]);
    this.deltaPos = [
      info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2 - this.nextPos[0],
      info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2 - this.nextPos[1],
    ];
    this.nextPos = [
      info.pos[0] * BLOCK_SIZE + BLOCK_SIZE / 2,
      info.pos[1] * BLOCK_SIZE + BLOCK_SIZE / 2,
    ];
  }
  delLayer(canvas) {
    for (let layer of this.layer) {
      canvas.remove(layer);
    }
  }
  play(t) {
    const ratio = 1 / (1 + Math.exp((0.5 - t) * 10));
    this.layer[0].translation.set(
      this.nextPos[0] - ratio * this.deltaPos[0],
      this.nextPos[1] - ratio * this.deltaPos[1]
    );
  }
}

class Selector {
  // feature request
  // not urgent
  // - refresh selector info both onmousemove and on room data refresh
  // - drop selector if cursor is out of bound (instead of stucking at the edge)
  constructor() {}
}

export class RoomMap {
  constructor() {
    this.totalRefresh = true;
    this.timeAnchor = new Date();
    this.infoColumnElement = document.querySelector("#upper-right-monitor");
    this.canvasElement = document.querySelector("#two-canvas");
    this.two = new Two({
      height: ORIGIN_RES,
      width: ORIGIN_RES,
      autostart: true,
    }).appendTo(this.canvasElement);
    this.two.scene.scale = this.canvasElement.offsetWidth / ORIGIN_RES;

    this.Terrain = new Object();
    this.Structures = new Object();
    this.Creeps = new Object();
    this.Selector = new Object({ x: -1, y: -1 });

    const canvas = document.querySelector("#two-canvas");
    document.addEventListener(`mousemove`, (event) => {
      const x01 = (event.pageX - canvas.offsetLeft) / canvas.offsetWidth,
        y01 = (event.pageY - canvas.offsetTop) / canvas.offsetHeight;
      [this.Selector.x, this.Selector.y] = [
        Math.floor(x01 * X_SIZE),
        Math.floor(y01 * Y_SIZE),
      ];
      this.refreshSelector(this.info);
    });

    this.two.update();
  }
  initSelectorLayer() {
    this.Selector.pos = new Two.Rectangle(
      0 * BLOCK_SIZE + BLOCK_SIZE / 2,
      0 * BLOCK_SIZE + BLOCK_SIZE / 2,
      BLOCK_SIZE,
      BLOCK_SIZE
    );
    this.Selector.pos.noStroke();
    this.Selector.pos.fill = WHITE;
    this.Selector.pos.opacity = 0.1;
    this.Selector.group.add(this.Selector.pos);

    this.Selector.info = _.map(Array(Y_SIZE), () => Array(X_SIZE));
  }
  refreshCanvas() {
    if (this.Terrain.group != undefined) {
      this.Terrain.group.remove();
    }
    if (this.Structures.group != undefined) {
      this.Structures.group.remove();
    }
    if (this.Creeps.group != undefined) {
      this.Creeps.group.remove();
    }
    if (this.Selector.group != undefined) {
      this.Selector.group.remove();
    }

    this.Terrain.group = new Two.Group().addTo(this.two.scene);
    this.Structures.group = new Two.Group().addTo(this.two.scene);
    this.Creeps.group = new Two.Group().addTo(this.two.scene);
    this.Selector.group = new Two.Group().addTo(this.two.scene);

    this.Creeps.map = new Map();
    this.Structures.map = new Map();

    this.initSelectorLayer();
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

  refreshStructure(info) {
    let structure;
    for (let str in info.structures) {
      switch (info.structures[str].structureType) {
        case "Source":
          if (this.Structures.map.has(str)) {
            let structure = this.Structures.map.get(str);
            structure.live = true;
          } else {
            structure = new Source(
              this.Structures.group,
              info.structures[str],
              this.two
            );
            this.Structures.map.set(str, structure);
            structure.live = true;
          }
          break;
        case "Controller":
          if (this.Structures.map.has(str)) {
            let structure = this.Structures.map.get(str);
            structure.live = true;
          } else {
            structure = new Controller(
              this.Structures.group,
              info.structures[str]
            );
            this.Structures.map.set(str, structure);
            structure.live = true;
          }
          break;
        case "Spawn":
          if (this.Structures.map.has(str)) {
            let structure = this.Structures.map.get(str);
            structure.live = true;
          } else {
            structure = new Spawn(this.Structures.group, info.structures[str]);
            this.Structures.map.set(str, structure);
            structure.live = true;
          }
          break;
      }
    }
    for (let strPair of this.Structures.map) {
      if (strPair[1].live === false) {
        strPair[1].delLayer(this.Structures.group);
        this.Structures.map.delete(strPair[0]);
      } else {
        strPair[1].live = false;
      }
    }
  }
  refreshCreep(info) {
    let creep;
    for (let crp in info.creeps) {
      if (this.Creeps.map.has(info.creeps[crp].id)) {
        creep = this.Creeps.map.get(info.creeps[crp].id);
        creep.refreshPos(info.creeps[crp]);
        creep.live = true;
      } else {
        creep = new Creep(this.Creeps.group, info.creeps[crp]);
        this.Creeps.map.set(info.creeps[crp].id, creep);
        creep.live = true;
      }
    }
    for (let crpPair of this.Creeps.map) {
      if (crpPair[1].live === false) {
        crpPair[1].delLayer(this.Creeps.group);
        this.Creeps.map.delete(crpPair[0]);
      } else {
        crpPair[1].live = false;
      }
    }
  }
  refreshSelector(info, panel = this.infoColumnElement) {
    const { x, y } = this.Selector;
    panel.innerHTML = `room: ${window.sessionStorage.getItem(`room`)}<br />`;
    if (x < 0 || x >= X_SIZE || y < 0 || y >= Y_SIZE)
      this.Selector.pos.opacity = `0.0`;
    else {
      panel.innerHTML += `x: ${x}, y: ${y}<br />`;
      this.Selector.pos.opacity = `0.1`;
      this.Selector.pos.translation.set(
        x * BLOCK_SIZE + BLOCK_SIZE / 2,
        y * BLOCK_SIZE + BLOCK_SIZE / 2
      );

      function print(object, indent = ``) {
        _.forEach(object, (value, key) => {
          if (value instanceof Object) {
            panel.innerHTML += `${indent}${key}: <br />`;
            print(value, indent + `|  `);
          } else panel.innerHTML += `${indent}${key}: ${value}<br />`;
        });
      }

      const rTerrain = _.map(info.terrain.split(`,`), (r) => r.split(``))[y][x],
        terrain = { x: `Wall`, "~": `Swamp`, " ": `Plain` }[rTerrain],
        isHere = (object) => _.isEqual(object.pos, [x, y]),
        structure = _.filter(info.structures, isHere),
        creep = _.filter(info.creeps, isHere);
      print({ terrain, structure, creep });
    }
  }
  refresh(info) {
    this.info = info;
    this.timeAnchor = new Date();
    if (info === undefined) return;
    if (this.Terrain.str != info.terrain) this.totalRefresh = true;
    if (this.totalRefresh) {
      this.refreshCanvas();

      this.refreshTerrain(info);
      this.refreshStructure(info);
      this.refreshCreep(info);
      this.refreshSelector(info);
      this.totalRefresh = false;
    } else {
      this.refreshCreep(info);
      this.refreshStructure(info);
      this.refreshSelector(info);
    }
  }
  play() {
    this.two.scene.scale = this.canvasElement.offsetWidth / ORIGIN_RES;
    if (this.totalRefresh) return;
    let t = 1 - (new Date() - this.timeAnchor) / 1000;
    for (let creep of this.Creeps.map.values()) {
      creep.play(t);
    }
    for (let structure of this.Structures.map.values()) {
      switch (structure.structureType) {
        case "Source":
          structure.play();
          break;
      }
    }
  }
}

export class ShardMap {
  constructor() {
    this.totalRefresh = true;
    this.canvasElement = document.querySelector("#two-canvas");
    this.two = new Two({
      height: ORIGIN_RES,
      width: ORIGIN_RES,
      autostart: true,
    }).appendTo(this.canvasElement);
    this.two.scene.scale = this.canvasElement.offsetWidth / ORIGIN_RES;

    this.Terrain = new Object();
    this.Selector = new Object({ info: {} });

    this.Terrain.group = new Two.Group().addTo(this.two.scene);
    this.Selector.group = new Two.Group().addTo(this.two.scene);

    this.Terrain.rooms = _.map(Array(2 * SHARD_SIZE), () =>
      Array(2 * SHARD_SIZE)
    );
    this.Terrain.infos = _.map(Array(2 * SHARD_SIZE), () =>
      Array(2 * SHARD_SIZE)
    );

    this.Selector.pos = new Two.Rectangle(
      0 * ROOM_SIZE + ROOM_SIZE / 2,
      0 * ROOM_SIZE + ROOM_SIZE / 2,
      ROOM_SIZE,
      ROOM_SIZE
    );
    this.Selector.pos.noStroke();
    this.Selector.pos.fill = WHITE;
    this.Selector.pos.opacity = 0.1;
    this.Selector.group.add(this.Selector.pos);

    const canvas = this.canvasElement;
    canvas.onmousemove = (event) => {
      const x01 = (event.pageX - canvas.offsetLeft) / canvas.offsetWidth,
        y01 = (event.pageY - canvas.offsetTop) / canvas.offsetHeight;
      this.mouseSelector(x01, y01);
    };
    canvas.ondblclick = (event) => {
      const x01 = (event.pageX - canvas.offsetLeft) / canvas.offsetWidth,
        y01 = (event.pageY - canvas.offsetTop) / canvas.offsetHeight;
      this.selectRoom(x01, y01);
    };

    this.two.update();
  }
  refresh(roomName, info, meta) {
    const [X, Y] = getXY(roomName);
    if (this.Terrain.infos[Y][X] === info) return;
    this.Terrain.infos[Y][X] = info;
    if (this.Terrain.rooms[Y][X] !== undefined)
      this.Terrain.rooms[Y][X].remove();
    this.Terrain.rooms[Y][X] = new Two.Group().addTo(this.Terrain.group);
    this.Terrain.rooms[Y][X].translation.set(X * ROOM_SIZE, Y * ROOM_SIZE);

    info = _.map(info.split(`,`), (r) => r.split(``));
    const addBlock = (x, y, color) => {
      const block = new Two.Rectangle(
        x * TINY_BLOCKSIZE + TINY_BLOCKSIZE / 2,
        y * TINY_BLOCKSIZE + TINY_BLOCKSIZE / 2,
        TINY_BLOCKSIZE,
        TINY_BLOCKSIZE
      );
      block.noStroke();
      block.fill = color;
      this.Terrain.rooms[Y][X].add(block);
    };
    for (let y = 0; y < Y_SIZE; y++) {
      for (let x = 0; x < X_SIZE; x++) {
        switch (info[y][x]) {
          case " ":
            break;
          case "~":
            addBlock(x, y, SWAMP_COLOR);
            break;
          case "x":
            addBlock(x, y, WALL_COLOR);
            break;
          case "c":
            addBlock(x, y, `#B0C94E`);
            break;
          case "s":
            addBlock(x, y, `#4EC9B0`);
            break;
          case "p":
            addBlock(x, y, `#C94EB0`);
            break;
          default:
            addBlock(x, y, `#4EB0C9`);
          // throw new Error(`Undefined info ${info[y][x]}!`);
        }
      }
    }

    const banner = new Two.Text(
      _.head(meta.owner),
      ROOM_SIZE / 2,
      ROOM_SIZE / 2
    );
    banner.family = `Consolas, monaco, monospace`;
    banner.alignment = `center`;
    banner.size = 64;
    banner.fill = `#4ec9b0`;
    banner.noStroke();
    this.Terrain.rooms[Y][X].add(banner);
  }
  play() {
    this.two.scene.scale = this.canvasElement.offsetWidth / ORIGIN_RES;
  }
  mouseSelector(x, y) {
    (x = Math.floor(x * 2 * SHARD_SIZE)), (y = Math.floor(y * 2 * SHARD_SIZE));
    if (x < 0 || x >= 2 * SHARD_SIZE || y < 0 || y >= 2 * SHARD_SIZE)
      this.Selector.inRange = false;
    else this.Selector.inRange = true;
    if (!this.Selector.inRange) return;
    Object.assign(this.Selector, { x, y });
    this.Selector.pos.translation.set(
      x * ROOM_SIZE + ROOM_SIZE / 2,
      y * ROOM_SIZE + ROOM_SIZE / 2
    );
  }
  selectRoom(x, y) {
    (x = Math.floor(x * 2 * SHARD_SIZE)), (y = Math.floor(y * 2 * SHARD_SIZE));
    if (x < 0 || x >= 2 * SHARD_SIZE || y < 0 || y >= 2 * SHARD_SIZE)
      this.Selector.inRange = false;
    else this.Selector.inRange = true;
    if (!this.Selector.inRange) return;
    x -= SHARD_SIZE;
    y -= SHARD_SIZE;
    window.sessionStorage.setItem("room", getName(x, y));
    location.replace(
      `${window.location.protocol}//${window.location.host}/room`
    );
  }
}
