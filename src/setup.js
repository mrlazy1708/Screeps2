`use strict`;

const _ = require(`lodash`);
const utils = require(`./utils`);
const real = require(`./real`);
const priorityQueue = require(`./priorityQueue`);
const constants = require(`./constants`);

/** Cannot build constructor in advance (outside):
 *    In case of player modifies prototypes, then other players would be influenced.
 */
module.exports = function (engine, player, context) {
  /** constructor for Memory */
  function Memory() {}

  /** constructor for Game object */
  function Game(engine, player) {
    /** Game.time */
    this.time = engine.time;

    const roomObjects_ = {};

    /** Game.rooms */
    this.rooms = _.mapValues(
      _.pickBy(engine.rooms, (room) => room.visible(player)),
      (room) => new Room(room, roomObjects_)
    );

    /** Game.creeps */
    this.creeps = _.mapValues(
      _.pickBy(engine.creeps, (creep) => creep.visible(player)),
      (creep) => new Creep(creep, roomObjects_, this.rooms)
    );

    /** Game.structures */
    this.structures = _.mapValues(
      _.pickBy(engine.structures, (structures) => structures.visible(player)),
      (structure) => {
        const constructor = context[`Structure${structure.structureType}`];
        return new constructor(structure, roomObjects_, this.rooms);
      }
    );

    /** Game.spawns */
    this.spawns = _.mapKeys(
      _.pickBy(
        Game.structures,
        (structure) => structure instanceof StructureSpawn
      ),
      `name`
    );

    /** Game.getObjectById */
    const creeps_ = _.mapKeys(Game.creeps, `id`),
      structures_ = Game.structures,
      GameObjects_ = _.merge({}, creeps_, structures_);
    Game.prototype.getObjectById = function (id) {
      return GameObjects_[id] || null;
    };
  }

  /** constructor for RoomPosition */
  function RoomPosition(x, y, roomName) {
    this.x = x;
    this.y = y;
    this.roomName = roomName;
  }

  /** RoomPosition.getRangeTo */
  RoomPosition.prototype.getRangeTo = function (pos) {
    if (!(pos instanceof RoomPosition)) {
      if (pos.pos instanceof RoomPosition) pos = pos.pos;
      else (pos = new RoomPosition(pos, opts, this.room.name)), (opts = arg);
    }
    return real.RoomPosition.prototype.getRangeTo.call(this, pos);
  };

  /** constructor for Store */
  function Store(store) {
    if (!(store instanceof real.Store)) throw new TypeError();

    /** Store.getCapacity */
    this.getCapacity = function (resourceType) {
      return store.getCapacity(resourceType);
    };

    /** Store.getUsed */
    this.getUsed = function (resourceType) {
      return store.getUsed(resourceType);
    };

    /** Store.getFree */
    this.getFree = function (resourceType) {
      return store.getFree(resourceType);
    };
  }

  /** constructor for PathFinder */
  function PathFinder(opts = {}) {
    this.moveCost = {
      [TERRAIN_PLAIN]: opts.plainCost || MOVE_COST[TERRAIN_PLAIN],
      [TERRAIN_SWAMP]: opts.swampCost || MOVE_COST[TERRAIN_SWAMP],
      [TERRAIN_WALL]: opts.wallCost || MOVE_COST[TERRAIN_WALL],
    };
    this.roomCallback =
      opts.roomCallback ||
      ((roomName) => {
        const terrain = context.Game.rooms[roomName].terrain;
        return _.map(terrain.data, (row) =>
          _.map(row, (sym) => this.moveCost[sym])
        );
      });
    this.flee = opts.flee || false;
    this.maxOps = opts.maxOps || 1000;
    this.maxCost = opts.maxCost || Infinity;
    this.heuristicWeight = opts.heuristicWeight || 1.2;
  }

  /** PathFinder.search with A-star algorithm */
  const hash = (pos) => `${pos.x},${pos.y}:${pos.roomName}`,
    prototype = real.RoomPosition.prototype,
    move = (pos, dir) => prototype.clamp.call(prototype.move.call(pos, dir));
  /** TODO: Optimize it! Such poor performance! */
  PathFinder.prototype.search = function (origin, goal) {
    if (!(goal instanceof Array)) goal = Array(goal);
    const [heuristic, moveCost] = [new Map(), new Map()],
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
      explore = (pos, ppos, d, h, g) =>
        internal.has(hash(pos)) && _.head(internal.get(hash(pos))) <= g
          ? null
          : (internal.set(hash(pos), [g, d, ppos]),
            frontier.push([g + h * this.heuristicWeight, g, pos])),
      reconstruct = (pos, info, path = [], poss = []) => {
        poss.unshift(pos);
        if (_.isEqual(pos, origin)) return Object.assign(info, { path, poss });
        const [_cost, dir, ppos] = internal.get(hash(pos));
        path.unshift(dir);
        return reconstruct(ppos, info, path, poss);
      };
    let [hBest, cost, ops, nearest] = [heuristicOf(origin), 0, 0, origin];
    explore(origin, null, null, hBest, 0);
    for (hBest *= this.heuristicWeight; ops < this.maxOps; ops++) {
      const top = frontier.pop();
      if (top === undefined) break;
      const [w, g, pos] = top;
      if (w - g < hBest) [hBest, cost, nearest] = [w - g, g, pos];
      if (goals[hash(pos)] !== undefined) break;
      _.forEach(utils.dirs, (dir) => {
        const posd = move(_.clone(pos), dir);
        explore(posd, pos, dir, heuristicOf(posd), g + moveCostOf(posd));
      });
    }
    const incomplete = hBest > 0;
    return reconstruct(nearest, { ops, cost, incomplete });
  };

  /** constructor for Room */
  function Room(room, roomObjects) {
    if (!room instanceof real.Room) throw new TypeError();

    this.name = room.name;

    this.terrain = new RoomTerrain(room.terrain);

    const rooms_ = (context.Memory.rooms = context.Memory.rooms || {});
    Object.defineProperty(this, `memory`, {
      get: () => (rooms_[this.name] = rooms_[this.name] || {}),
    });

    const objects_ = (roomObjects[this.name] = {});
    this.find = _.partial(Room.prototype.find, objects_);
  }

  /** Room.find */
  Room.prototype.find = function (objects, type) {
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
  };

  /** constructor for RoomTerrain */
  function RoomTerrain(terrain) {
    this.data = terrain.data;
  }

  /** RoomTerrain.get */
  RoomTerrain.prototype.get = function (x, y) {
    return (this.data[y] || [])[x];
  };

  /** constructor for RoomObject */
  function RoomObject(object, _roomObjects, rooms) {
    if (!object instanceof real.RoomObject) throw new TypeError();

    this.id = object.id;
    this.room = rooms[object.pos.roomName];
    this.pos = new RoomPosition(object.pos.x, object.pos.y, this.room.name);
    this.hits = object.hits;
    this.hitsMax = object.hitsMax;
  }

  /** constructor for Creep inherited from RoomObject */
  function Creep(creep, roomObjects) {
    if (!creep instanceof real.Creep) throw new TypeError();

    Object.assign(this, new RoomObject(...arguments));
    roomObjects[this.room.name][this.id] = this;

    this.name = creep.name;
    this.head = creep.head;
    this.body = creep.body;
    this.fatigue = creep.fatigue;
    this.owner = creep.owner;
    this.my = this.owner === player.name;
    this.store = new Store(creep.store);

    /** Creep.getActiveBodyparts */
    this.getActiveBodyparts = function (bodypart) {
      return creep.getActiveBodyparts(bodypart);
    };

    /** Creep.move */
    this.move = function (dir) {
      return creep.move(dir);
    };

    /** Creep.harvest */
    this.harvest = function (target) {
      if (!(target instanceof StructureSource)) return ERR_INVALID_ARGS;
      return creep.harvest(target);
    };

    /** Creep.upgradeController */
    this.upgradeController = function (target) {
      if (!(target instanceof StructureController)) return ERR_INVALID_ARGS;
      return creep.upgradeController(target);
    };
  }

  /** Creep.memory */
  Object.defineProperty(Creep.prototype, `memory`, {
    get: function () {
      const creeps_ = (context.Memory.creeps = context.Memory.creeps || {});
      return (creeps_[this.name] = creeps_[this.name] || {});
    },
  });

  /** Creep.moveByPath */
  Creep.prototype.moveByPath = function (path) {
    if (!(path instanceof Array)) return ERR_INVALID_ARGS;
    const dir = _.head(path);
    if (dir === undefined) return ERR_NO_PATH;
    return this.move(dir);
  };

  /** Creep.moveTo */
  Creep.prototype.moveTo = function (pos, opts = {}, arg = {}) {
    if (!(pos instanceof RoomPosition)) {
      if (pos.pos instanceof RoomPosition) pos = pos.pos;
      else (pos = new RoomPosition(pos, opts, this.room.name)), (opts = arg);
    }
    if (pos === undefined || pos === null) return ERR_INVALID_ARGS;
    if (_.isEqual(this.pos, pos)) return OK;
    const serializeMemory =
      opts.serializeMemory || opts.serializeMemory === undefined;
    let path = this.memory._move;
    if (serializeMemory) path = _.map(path, (code) => utils.dirs[code]);
    const noPathFinding = opts.noPathFinding,
      reusePath = opts.reusePath || 5;
    if (_.head(path) === undefined && !noPathFinding)
      path = _.take(new PathFinder().search(this.pos, pos).path, reusePath);
    const ret = this.moveByPath(path);
    if (ret === OK) path = _.tail(path);
    if (serializeMemory)
      (path = _.map(path, (dir) => utils.dirCodes[dir])),
        (path = _.join(path, ``));
    this.memory._move = path;
    return ret;
  };

  /** constructor for Structure inherited from RoomObject */
  function Structure(structure) {
    if (!(structure instanceof real.Structure)) throw new TypeError();

    Object.assign(this, new RoomObject(...arguments));

    this.structureType = structure.structureType;
  }

  /** constructor for StructureController inherited from Structure */
  function StructureController(controller, roomObjects) {
    if (!controller instanceof real.StructureController) throw new TypeError();

    Object.assign(this, new Structure(...arguments));
    roomObjects[this.room.name][this.id] = this;

    this.level = controller.level;
    this.progress = controller.progress;
    this.progressTotal = controller.progressTotal;

    this.room.controller = this;
  }

  /** constructor for StructureSource inherited from Structure */
  function StructureSource(source, roomObjects) {
    if (!source instanceof real.StructureSource) throw new TypeError();

    Object.assign(this, new Structure(...arguments));
    roomObjects[this.room.name][this.id] = this;

    this.ticksToRegeneration = source.ticksToRegeneration;
    this.store = new Store(source.store);
  }

  /** constructor for OwnedStructure inherited from Structure */
  function OwnedStructure(structure) {
    if (!structure instanceof real.OwnedStructure) throw new TypeError();

    Object.assign(this, new Structure(...arguments));

    this.owner = structure.owner;
    this.my = this.owner === player.name;
  }

  /** OwnedStructure.memory */
  Object.defineProperty(OwnedStructure.prototype, `memory`, {
    get: () => {
      const structures_ = (context.Memory.structures =
        context.Memory.structures || {});
      return (structures_[this.name] = structures_[this.name] || {});
    },
  });

  /** constructor for StructureSpawn inherited from OwnedStructure */
  function StructureSpawn(spawn, roomObjects) {
    if (!spawn instanceof real.StructureSpawn) throw new TypeError();

    Object.assign(this, new OwnedStructure(...arguments));
    roomObjects[this.room.name][this.id] = this;

    this.spawnCreep = spawn.scheduleSpawnCreep.bind(spawn);
  }

  /** set prototypes */
  {
    Object.setPrototypeOf(Creep.prototype, RoomObject.prototype);
    Object.setPrototypeOf(Structure.prototype, RoomObject.prototype);
    {
      Object.setPrototypeOf(StructureController.prototype, Structure.prototype);
      Object.setPrototypeOf(StructureSource.prototype, Structure.prototype);
      Object.setPrototypeOf(OwnedStructure.prototype, Structure.prototype);
      {
        Object.setPrototypeOf(
          StructureSpawn.prototype,
          OwnedStructure.prototype
        );
      }
    }
  }

  /** export constants */
  Object.assign(context, constants);

  /** export constructors */
  context.PathFinder = PathFinder;
  context.Room = Room;
  context.RoomTerrain = RoomTerrain;
  context.RoomObject = RoomObject;
  context.Creep = Creep;
  context.Structure = Structure;
  context.StructureController = StructureController;
  context.StructureSource = StructureSource;
  context.OwnedStructure = OwnedStructure;
  context.StructureSpawn = StructureSpawn;
  context.Store = Store;
  context.RoomPosition = RoomPosition;

  /** construct Memory */
  context.Memory = new Memory();

  /** construct Game Object */
  context.Game = new Game(engine, player);

  // const data =
  //   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx,xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx,xxxxxxxxxxxx~~~xxxxxxxxxxxxxxxxxxx    ~~~    ~~~~xxxxxx~~~~~~~~~,xxx~~ xxxxx~~~~~xxxxxxxxxxxxxxxxxx           ~~~~ xxxxx~~~      ,xxx~   xxx       xx       ~~~~xxxxx          ~~~   xxxxx~       ,xxx               x       ~~~~  xxxxx        ~~      xxxxxx     ,xxx                       ~~~~    xxxxx      ~         xxxxx    ,xxxx                      ~~~        xxxxxx                     ,xxxx                       ~~         xxxxx                     ,xxxxx~~                    ~~        ~~ x                       ,xxxxx~~~~               xxx ~~       ~~                         ,xxxxxx~~~~~              xx         ~~~                         ,xxxxxx~~~~~~     ~~~                ~~~                         ,xxxxxx~~~~~~~~  ~~~~~               ~~~                         ,xxxxx  ~~~~~~~~~~~~~~         ~~    ~~~                         ,xxxx    ~~xxxxx~~~~~                 ~~                         ,xxx      ~~xxxxxx                xxx ~~                         ,xx       ~~   xxxxx             xxxx                            ,xx              xxxx           xxx                        x     ,xx~               xx           xx              xxx       xxx    ,xx                       ~~   xx            xxxxxx      xxxx    ,xx                       ~~~               xxxxxxx     xxxxxx   ,xx                        ~~~             xxxxxxxxx   xxxxxx    ,xxxxxx              ~      ~~~           xxxxxxxxxxxxxxxxxxx    ,xxxxxxxx            ~      ~~~~         xxxxxxxxxxxxxxxxxxx     ,xxxxxxxxx                    ~~~        xxxxxxxxxxxxxxxxx       ,xxxxxxxx                       ~        xxxxxxxx                ,xxxxxx                             ~     xxxxxx                 ,xxxxx                             ~~~~   xxxxx                 ~,xxxxx                              ~~~~~ xxxx                  ~,xxxxxx                             ~~~~~~xxx                  ~~,xxxxxx                 ~~~          ~~~~~xxx~~           xx   ~~,xxxxx     ~~           ~~~ xx         ~~~xxx~~~~       xxxxx  ~~,xxxxx    ~~~~           ~~~xxx            xx   xxx    xxxxx     ,xxxx     ~~~~            ~ xxxx           xx  xxxxx  xxxx       ,xxx      ~~~~              xxxxx           xxxxxxxxx  x         ,xx        ~~~            xxxxxxx            xxxxxxxx            ,xx        ~~~           xxxxxx              xxxxxxx            ~,xx         ~~          xxx                    xxx              ~,xx         ~~          xx                                       ,xx                    xx                                        ,xxx                  xx           xxxxx                     xx  ,xxx       xx        xxx~~       xxxxxxxx                   xxx  ,xxxx    xxxxxx     xxxx~~       xxxxxxx                    xxx  ,xxxx   xxxxxxxx   xxxxx~~       xxxxxx                     xxx  ,xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                       xx   ,xxxxxxxxxxx  xxxxxxxxxxxxxxxxxxx                           xx   ,xxxxxxxxx    xxxxxxxxxxxxxxxxxx                                 ,xxxxxxx~      xxxxxxxxxxxxxxxx                                  ,xxxxxx~              xxx                                        ,xxxxx~                                                x        x,xxxxx~                                                x         ,xxxxxx                                         ~       x        ,xxxxx         ~                                ~~      xx       ,xx          ~~~~                                ~~      xx      ,xx         ~~~~~                                ~~~     xxx     ,xx          ~~~~                  x              ~~~     xxx    ,xxx         ~~~~                xxx               ~~~~    xx    ,xxx          ~~~                x            xx     ~~    xxx   ,xxx          ~~~                             xx           xxxx  ,xx            ~~                             xx           xxxxxx,xx          x ~~                             xx           xxxxxx,xxx       xxx ~~                             xx           xxxxxx,xxxxxxxxxxx   ~~                             xx           xxxxxx";
  // const terrain = new real.Room.Terrain(data);

  // const join = (row) => _.join(row, ``);
  // console.log(`|${_.join(_.map(terrain.array, join), `|\n|`)}|`);

  // const Game = { rooms: { W0N0: { terrain } } };
  // const pf = new PathFinder();
  // const origin = new RoomPosition(13, 3, `W0N0`);
  // // const goal = new RoomPosition(35, 13, `W0N0`);
  // const goal = new RoomPosition(13, 3, `W0N0`);
  // // const goal = new RoomPosition(35, 2, `W0N0`);
  // const start = new Date();
  // const route = pf.search(origin, goal);
  // console.log(route);
  // console.log(new Date() - start);
};
