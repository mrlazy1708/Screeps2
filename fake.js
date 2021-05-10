`use strict`;

const _ = require(`lodash`);
const utils = require(`./utils`);
const real = require(`./real`);
const priorityQueue = require(`./priorityQueue`);

class GameClass {
  constructor(engine, player) {
    this.time = engine.time;

    const roomObjects = {};
    this.rooms = _.mapValues(
      _.pickBy(engine.rooms, (room) => room.visible(player)),
      (room) => new Room(room, roomObjects, player)
    );

    this.creeps = _.mapValues(
      _.pickBy(engine.creeps, (creep) => creep.visible(player)),
      (creep) => new Creep(creep, roomObjects, this.rooms, player)
    );

    this.structures = _.mapValues(
      _.pickBy(engine.structures, (structures) => structures.visible(player)),
      (structure) => Structure.new(structure, roomObjects, this.rooms, player)
    );

    this.spawns = _.mapKeys(
      _.pickBy(
        this.structures,
        (structure) => structure instanceof StructureSpawn
      ),
      `name`
    );

    this.getObjectById = this.getObjectById.bind(
      this,
      _.merge({}, _.mapKeys(this.creeps, `id`), this.structures)
    );
  }
  getObjectById(objects, id) {
    return objects[id] || null;
  }
}
module.exports.GameClass = GameClass;

class PathFinder {
  constructor(opts = {}) {
    this.moveCost = {
      [TERRAIN_PLAIN]: opts.plainCost || MOVE_COST[TERRAIN_PLAIN],
      [TERRAIN_SWAMP]: opts.swampCost || MOVE_COST[TERRAIN_SWAMP],
      [TERRAIN_WALL]: opts.wallCost || MOVE_COST[TERRAIN_WALL],
    };
    this.roomCallback =
      opts.roomCallback ||
      ((roomName) => {
        const terrain = Game.rooms[roomName].terrain;
        return _.map(terrain.data, (row) =>
          _.map(row, (sym) => this.moveCost[sym])
        );
      });
    this.flee = opts.flee || false;
    this.maxOps = opts.maxOps || 1000;
    this.maxCost = opts.maxCost || Infinity;
    this.heuristicWeight = opts.heuristicWeight || 1.2;
  }
  /** TODO: Optimize it! Such poor performance! */
  /** Search with A-star algorithm */
  search(origin, goal) {
    if (!(goal instanceof Array)) goal = Array(goal);
    const hash = (pos) => `${pos.x},${pos.y}:${pos.roomName}`,
      [heuristic, moveCost] = [new Map(), new Map()],
      [internal, frontier] = [new Map(), new priorityQueue()],
      goals = _.invert(_.map(goal, hash)),
      moveCostOf = (pos) => {
        let val = moveCost.get(hash(pos).roomName);
        if (val === undefined)
          (val = this.roomCallback(pos.roomName)), moveCost.set(hash(pos), val);
        return val[pos.y][pos.x];
      },
      heuristicOf = (pos) => {
        let val = heuristic.get(hash(pos));
        if (val === undefined)
          (val = _.min(_.map(goal, pos.getRangeTo.bind(pos)))),
            heuristic.set(hash(pos), val);
        return val;
      },
      explore = (pos, ppos, h, g) =>
        internal.has(hash(pos)) && _.head(internal.get(hash(pos))) <= g
          ? null
          : (internal.set(hash(pos), [g, ppos]),
            frontier.push([g + h * this.heuristicWeight, g, pos])),
      reconstruct = (pos, route = []) => (
        route.unshift(pos),
        _.isEqual(pos, origin)
          ? route
          : reconstruct(_.last(internal.get(hash(pos))), route)
      );
    explore(origin, null, heuristicOf(origin), 0);
    for (let ops = 0; ops < this.maxOps; ops++) {
      const top = frontier.pop();
      if (top === undefined) break;
      const [_h, g, pos] = top;
      if (goals[hash(pos)] !== undefined) return reconstruct(pos);
      _.forEach(utils.dxdyOf, (__, dir) => {
        const posd = real.RoomPosition.clamp(
          real.RoomPosition.move(_.clone(pos), dir)
        );
        explore(posd, pos, heuristicOf(posd), g + moveCostOf(posd));
      });
    }
    return null; // temporary
  }
}
module.exports.PathFinder = PathFinder;

class Room {
  constructor(room, roomObjects) {
    if (!room instanceof real.Room) throw new TypeError();
    this.name = room.name;
    this.find = this.find.bind(this, (roomObjects[this.name] = {}));
  }
  get memory() {
    const rooms = (Memory.rooms = Memory.rooms || {});
    return (rooms[this.name] = rooms[this.name] || {});
  }
  find(objects, type) {
    const findExits = () => {
        const exits = _.filter(
          _.concat(
            _.zip(_.range(ROOM_WIDTH), 0),
            _.zip(_.range(ROOM_WIDTH), ROOM_HEIGHT - 1),
            _.zip(0, _.range(ROOM_HEIGHT)),
            _.zip(ROOM_WIDTH - 1, _.range(ROOM_HEIGHT))
          ),
          ([x, y]) => this.terrain.look(x, y) !== TERRAIN_WALL
        );
        return _.map(exits, (xy) => new RoomPosition(...xy, this.name));
      },
      findCreeps = () => _.filter(objects, (object) => object instanceof Creep),
      findStructures = () => {
        return _.filter(objects, (object) => object instanceof Structure);
      };
    if (type === FIND_EXITS) return findExits();
    if (type === FIND_TOP_EXITS)
      return _.filter(findExits(), (exit) => exit.y === 0);
    if (type === FIND_RIGHT_EXITS)
      return _.filter(findExits(), (exit) => exit.x + 1 === ROOM_WIDTH);
    if (type === FIND_BOTTOM_EXITS)
      return _.filter(findExits(), (exit) => exit.y + 1 === ROOM_HEIGHT);
    if (type === FIND_LEFT_EXITS)
      return _.filter(findEXits(), (exit) => exit.x === 0);
    // if (type === FIND_FLAGS)
    // if (type === FIND_DROPPED_RESOURCES)
    if (type === FIND_CREEPS) return findCreeps();
    if (type === FIND_MY_CREEPS)
      return _.filter(findCreeps(), (creep) => creep.my);
    if (type === FIND_HOSTILE_CREEPS)
      return _.filter(findCreeps(), (creep) => !creep.my);
    if (type === FIND_STRUCTURES) return findStructures();
    if (type === FIND_MY_STRUCTURES)
      return _.filter(
        findStructures(),
        (structure) => structure instanceof OwnedStructure && structure.my
      );
    if (type === FIND_HOSTILE_STRUCTURES)
      return _.filter(
        findStructures(),
        (structure) => structure instanceof OwnedStructure && !structure.my
      );
    if (type === FIND_SPAWNS)
      return _.filter(
        findStructures(),
        (structure) => structure instanceof StructureSpawn
      );
    if (type === FIND_MY_SPAWNS)
      return _.filter(
        findStructures(),
        (structure) => structure instanceof StructureSpawn && structure.my
      );
    if (type === FIND_HOSTILE_SPAWNS)
      return _.filter(
        findStructures(),
        (structure) => structure instanceof StructureSpawn && !structure.my
      );
    if (type === FIND_SOURCES)
      return _.filter(
        findStructures(),
        (structure) => structure instanceof StructureSource
      );
    // if (type === FIND_ACTIVE_SOURCES)
    // if (type === FIND_CONSTRUCTION_SITES)
    // if (type === FIND_MY_CONSTRUCTION_SITES)
    // if (type === FIND_HOSTILE_CONSTRUCTION_SITES)
    // if (type === FIND_MINERALS)
    // if (type === FIND_NUKES)
    // if (type === FIND_TOMBSTONES)
    // if (type === FIND_DEPOSITS)
    // if (type === FIND_RUINS)
  }
}
module.exports.Room = Room;

class RoomObject {
  constructor(object, _roomObjects, rooms) {
    if (!object instanceof real.RoomObject) throw new TypeError();
    this.pos = new RoomPosition(...object.pos.recover);
    this.room = rooms[this.pos.roomName];
    this.hits = object.hits;
    this.hitsMax = object.hitsMax;
    this.id = object.id;
  }
}
module.exports.RoomObject = RoomObject;

class Creep extends RoomObject {
  constructor(creep, roomObjects, player) {
    if (!creep instanceof real.Creep) throw new TypeError();
    super(...arguments), (roomObjects[this.room.name][this.id] = this);
    this.name = creep.name;
    this.owner = creep.owner;
    this.my = this.owner === player.name;

    this.move = creep.scheduleMove.bind(creep);
  }
  get memory() {
    const creeps = (Memory.creeps = Memory.creeps || {});
    return (creeps[this.name] = creeps[this.name] || {});
  }
}
module.exports.Creep = Creep;

class Structure extends RoomObject {
  static new(structure) {
    return new module.exports[`Structure${structure.structureType}`](
      ...arguments
    );
  }
  constructor(structure) {
    if (!(structure instanceof real.Structure)) throw new TypeError();
    super(...arguments);
    this.structureType = structure.structureType;
  }
}
module.exports.Structure = Structure;

class StructureController extends Structure {
  constructor(controller, roomObjects) {
    if (!controller instanceof real.StructureController) throw new TypeError();
    super(...arguments), (roomObjects[this.room.name][this.id] = this);
    this.room.controller = this;
  }
}
module.exports.StructureController = StructureController;

class StructureSource extends Structure {
  constructor(source, roomObjects) {
    if (!source instanceof real.StructureSource) throw new TypeError();
    super(...arguments), (roomObjects[this.room.name][this.id] = this);
  }
}
module.exports.StructureSource = StructureSource;

class OwnedStructure extends Structure {
  constructor(structure, _roomObjects, _rooms, player) {
    if (!structure instanceof real.OwnedStructure) throw new TypeError();
    super(...arguments);
    this.owner = structure.owner;
    this.my = this.owner === player.name;
    Object.defineProperty(this, `memory`, {
      get: () => {
        const structures = (player.Memory.structures =
          player.Memory.structures || {});
        return (structures[this.id] = structures[this.id] || {});
      },
    });
  }
}
module.exports.OwnedStructure = OwnedStructure;

class StructureSpawn extends OwnedStructure {
  constructor(spawn, roomObjects) {
    if (!spawn instanceof real.StructureSpawn) throw new TypeError();
    super(...arguments), (roomObjects[this.room.name][this.id] = this);

    this.spawnCreep = spawn.scheduleSpawnCreep.bind(spawn);
  }
}
module.exports.StructureSpawn = StructureSpawn;

class RoomPosition {
  constructor(x, y, roomName) {
    this.x = x;
    this.y = y;
    this.roomName = roomName;
  }
  getRangeTo(pos) {
    if (!(pos instanceof RoomPosition)) pos = new RoomPosition(...arguments);
    const [tX, tY] = real.RoomPosition.parse(this.roomName),
      [pX, pY] = real.RoomPosition.parse(pos.roomName);
    return Math.max(
      Math.abs(tX * ROOM_WIDTH + this.x - (pX * ROOM_WIDTH + pos.x)),
      Math.abs(tY * ROOM_HEIGHT + this.y - (pY * ROOM_HEIGHT + pos.y))
    );
  }
}
module.exports.RoomPosition = RoomPosition;

function Store(creep) {
  if (!creep instanceof real.Creep) throw new TypeError();
  store = new Proxy(creep.body, {
    get: (body, type) => _.sumBy(body, (part) => part.type === CARRY),
  });
  return store;
}
module.exports.Store = Store;

// const data =
//   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx,xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx,xxxxxxxxxxxx~~~xxxxxxxxxxxxxxxxxxx    ~~~    ~~~~xxxxxx~~~~~~~~~,xxx~~ xxxxx~~~~~xxxxxxxxxxxxxxxxxx           ~~~~ xxxxx~~~      ,xxx~   xxx       xx       ~~~~xxxxx          ~~~   xxxxx~       ,xxx               x       ~~~~  xxxxx        ~~      xxxxxx     ,xxx                       ~~~~    xxxxx      ~         xxxxx    ,xxxx                      ~~~        xxxxxx                     ,xxxx                       ~~         xxxxx                     ,xxxxx~~                    ~~        ~~ x                       ,xxxxx~~~~               xxx ~~       ~~                         ,xxxxxx~~~~~              xx         ~~~                         ,xxxxxx~~~~~~     ~~~                ~~~                         ,xxxxxx~~~~~~~~  ~~~~~               ~~~                         ,xxxxx  ~~~~~~~~~~~~~~         ~~    ~~~                         ,xxxx    ~~xxxxx~~~~~                 ~~                         ,xxx      ~~xxxxxx                xxx ~~                         ,xx       ~~   xxxxx             xxxx                            ,xx              xxxx           xxx                        x     ,xx~               xx           xx              xxx       xxx    ,xx                       ~~   xx            xxxxxx      xxxx    ,xx                       ~~~               xxxxxxx     xxxxxx   ,xx                        ~~~             xxxxxxxxx   xxxxxx    ,xxxxxx              ~      ~~~           xxxxxxxxxxxxxxxxxxx    ,xxxxxxxx            ~      ~~~~         xxxxxxxxxxxxxxxxxxx     ,xxxxxxxxx                    ~~~        xxxxxxxxxxxxxxxxx       ,xxxxxxxx                       ~        xxxxxxxx                ,xxxxxx                             ~     xxxxxx                 ,xxxxx                             ~~~~   xxxxx                 ~,xxxxx                              ~~~~~ xxxx                  ~,xxxxxx                             ~~~~~~xxx                  ~~,xxxxxx                 ~~~          ~~~~~xxx~~           xx   ~~,xxxxx     ~~           ~~~ xx         ~~~xxx~~~~       xxxxx  ~~,xxxxx    ~~~~           ~~~xxx            xx   xxx    xxxxx     ,xxxx     ~~~~            ~ xxxx           xx  xxxxx  xxxx       ,xxx      ~~~~              xxxxx           xxxxxxxxx  x         ,xx        ~~~            xxxxxxx            xxxxxxxx            ,xx        ~~~           xxxxxx              xxxxxxx            ~,xx         ~~          xxx                    xxx              ~,xx         ~~          xx                                       ,xx                    xx                                        ,xxx                  xx           xxxxx                     xx  ,xxx       xx        xxx~~       xxxxxxxx                   xxx  ,xxxx    xxxxxx     xxxx~~       xxxxxxx                    xxx  ,xxxx   xxxxxxxx   xxxxx~~       xxxxxx                     xxx  ,xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                       xx   ,xxxxxxxxxxx  xxxxxxxxxxxxxxxxxxx                           xx   ,xxxxxxxxx    xxxxxxxxxxxxxxxxxx                                 ,xxxxxxx~      xxxxxxxxxxxxxxxx                                  ,xxxxxx~              xxx                                        ,xxxxx~                                                x        x,xxxxx~                                                x         ,xxxxxx                                         ~       x        ,xxxxx         ~                                ~~      xx       ,xx          ~~~~                                ~~      xx      ,xx         ~~~~~                                ~~~     xxx     ,xx          ~~~~                  x              ~~~     xxx    ,xxx         ~~~~                xxx               ~~~~    xx    ,xxx          ~~~                x            xx     ~~    xxx   ,xxx          ~~~                             xx           xxxx  ,xx            ~~                             xx           xxxxxx,xx          x ~~                             xx           xxxxxx,xxx       xxx ~~                             xx           xxxxxx,xxxxxxxxxxx   ~~                             xx           xxxxxx";
// const terrain = new real.Room.Terrain(data);

// const join = (row) => _.join(row, ``);
// console.log(`|${_.join(_.map(terrain.array, join), `|\n|`)}|`);

// const Game = { rooms: { W0N0: { terrain } } };
// const pf = new PathFinder();
// const origin = new RoomPosition(13, 3, `W0N0`);
// // const goal = new RoomPosition(35, 13, `W0N0`);
// // const goal = new RoomPosition(56, 3, `W0N0`);
// const goal = new RoomPosition(35, 2, `W0N0`);
// const start = new Date();
// const route = pf.search(origin, goal);
// console.log(route);
// console.log(new Date() - start);
