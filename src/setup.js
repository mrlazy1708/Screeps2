`use strict`;

const _ = require(`lodash`);
const assert = require(`assert/strict`);
const constants = require(`./constants`);
const utils = require(`./utils`);
const Queue = require(`./queue`);

/** construct prototypes for player from engine under context */
function create(context, engine, player) {
  /** Game class defination */
  class Game {
    /** constructor for Game */
    constructor() {
      this.time = engine.time;

      /** Game.rooms */
      this.rooms = _.mapValues(
        _.pickBy(engine.rooms, player.visible),
        (room, name) => new Room(room, name)
      );

      /** Game.creeps */
      this.creeps = _.merge({}, ..._.map(this.rooms, `creeps`));

      /** Game.structures */
      this.structures = _.merge({}, ..._.map(this.rooms, `structures`));

      /** Game.spawns */
      const isSpawn = (structure) => structure instanceof StructureSpawn;
      this.spawns = _.mapKeys(_.pickBy(this.structures, isSpawn), `name`);
    }
    /** Game.getObjectById */
    getObjectById(id) {
      const creeps = _.mapKeys(this.creeps, `id`),
        structures = this.structures;
      return creeps[id] || structures[id];
    }
  }

  /** Memory class defination */
  class Memory {
    /** constructor for Room */
    constructor() {}
  }

  /** Room class defination */
  class Room {
    /** constructor for Room */
    constructor(data, name) {
      this.name = name;

      this.terrain = new RoomTerrain(data.terrain);
      this.creeps = _.mapValues(
        data.creeps,
        (creep, name) => new Creep(creep, name, this)
      );
      this.structures = _.mapValues(data.structures, (structure, id) =>
        Structure.new(structure, id, this)
      );
    }
    /** update room stats */
    update() {}
    /** get Memory.rooms[roomName] */
    get memory() {
      const rooms = (context.Memory.rooms = context.Memory.rooms || {});
      return (rooms[this.name] = rooms[this.name] || {});
    }
    /** look for roomObjects at RoomPosition */
    at(pos) {
      const creeps = _.filter(Game.creeps, { pos: pos }),
        structures = _.filter(Game.structures, { pos: pos });
      return _.concat(creeps, structures);
    }
    /** find objects within room */
    find(type) {
      const creeps = _.filter(context.Game.creeps, { room: this }),
        structures = _.filter(context.Game.structures, { room: this });
      // if (type === FIND_EXITS) return findExits();
      // if (type === FIND_TOP_EXITS)
      //   return _.filter(findExits(), (exit) => exit.y === 0);
      // if (type === FIND_RIGHT_EXITS)
      //   return _.filter(findExits(), (exit) => exit.x + 1 === ROOM_WIDTH);
      // if (type === FIND_BOTTOM_EXITS)
      //   return _.filter(findExits(), (exit) => exit.y + 1 === ROOM_HEIGHT);
      // if (type === FIND_LEFT_EXITS)
      // return _.filter(findEXits(), (exit) => exit.x === 0);
      // if (type === FIND_FLAGS)
      // if (type === FIND_DROPPED_RESOURCES)
      if (type === FIND_CREEPS) return creeps;
      if (type === FIND_MY_CREEPS) return _.filter(creeps, `my`);
      if (type === FIND_HOSTILE_CREEPS) return _.filter(creeps, { my: false });
      if (type === FIND_STRUCTURES) return structures;
      if (type === FIND_MY_STRUCTURES) return _.filter(structures, `my`);
      if (type === FIND_HOSTILE_STRUCTURES)
        return _.filter(structures, { my: false });
      if (type === FIND_SPAWNS)
        return _.filter(structures, { constructor: StructureSpawn });
      if (type === FIND_MY_SPAWNS)
        return _.filter(structures, { constructor: StructureSpawn, my: true });
      if (type === FIND_HOSTILE_SPAWNS)
        return _.filter(structures, { constructor: StructureSpawn, my: false });
      if (type === FIND_SOURCES)
        return _.filter(structures, { constructor: StructureSource });
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
    /** get room terrain and objects in ASCII Array */
    get array() {
      const array = this.terrain.array,
        draw = (object) => {
          const pos = object.pos;
          console.log(pos, utils.symbolOf(object));
          array[pos.y][pos.x] = utils.symbolOf(object);
        };
      _.forEach(this.creeps, draw);
      _.forEach(this.structures, draw);
      return array;
    }
    /** get room terrain and objects in String */
    get print() {
      const join = (row) => _.join(row, ``);
      return `|${_.join(_.map(this.array, join), `|\n|`)}|`;
    }
    /** get recovering data */
    get recover() {
      const recover = {};
      recover.terrain = this.terrain.recover;
      recover.creeps = _.mapValues(this.creeps, `recover`);
      recover.structures = _.mapValues(this.structures, `recover`);
      return recover;
    }
  }

  /** RoomPosition class defination */
  class RoomPosition {
    /** constructor for RoomPosition */
    constructor(coords, roomName) {
      this.x = `x` in coords ? coords.x : coords[0];
      this.y = `y` in coords ? coords.y : coords[1];
      this.roomName = roomName || coords.roomName;
      assert(this.x >= 0 && this.x < ROOM_WIDTH, `Invalid x coordinate!`);
      assert(this.y >= 0 && this.y < ROOM_HEIGHT, `Invalid y coordinate!`);
      assert.match(this.roomName, /[WE]\d+[NS]\d+/, `Invalid room name!`);
    }
    /** get X coordinate in roomName */
    get X() {
      const [__, quad, coor] = /([WE])(\d+)[NS]\d+/.exec(this.roomName);
      if (quad === `W`) return -1 - Number(coor);
      if (quad === `E`) return Number(coor);
    }
    /** set X coordinate in roomName */
    set X(x) {
      const [__, rest] = /[WE]\d+([NS]\d+)/.exec(this.roomName);
      return (this.roomName = `${x >= 0 ? `E${x}` : `W${-1 - x}`}${rest}`);
    }
    /** get Y coordinate in roomName */
    get Y() {
      const [__, quad, coor] = /[WE]\d+([NS])(\d+)/.exec(this.roomName);
      if (quad === `N`) return -1 - Number(coor);
      if (quad === `S`) return Number(coor);
    }
    /** set Y coordinate in roomName */
    set Y(y) {
      const [__, rest] = /([WE]\d+)[NS]\d+/.exec(this.roomName);
      return (this.roomName = `${rest}${y >= 0 ? `S${y}` : `N${-1 - y}`}`);
    }
    /** convert to number */
    get [Symbol.toPrimitive]() {
      return (pref) => {
        if (pref === `default` || pref === `string`)
          return `[${this.roomName}: (${this.x}, ${this.y})]`;
        if (pref === `number`) return this.x + this.y * ROOM_WIDTH;
      };
    }
    /** look for objects here */
    look() {
      const room = context.Game.rooms[this.roomName];
      assert(room !== undefined, `Invalid wild RoomPosition`);
      const roomObjects = room.at(this),
        terrain = room.terrain.at(this);
      return _.concat([terrain], roomObjects);
    }
    /** clone RoomPosition instance */
    clone() {
      return new RoomPosition(this, this.roomName);
    }
    /** move instance towards direction */
    move(dir) {
      const [dx, dy] = utils.dxdy[dir];
      (this.x += dx), (this.y += dy);
      return this;
    }
    /** clamp RoomPosition over boundaries */
    clamp(minX = 0, minY = 0, maxX = ROOM_WIDTH - 1, maxY = ROOM_HEIGHT - 1) {
      if (this.x <= minX) this.X--, (this.x = maxX);
      else if (this.x >= maxX) this.X++, (this.x = minX);
      if (this.y <= minY) this.Y--, (this.y = maxY);
      else if (this.y >= maxY) this.Y++, (this.y = minY);
      return this;
    }
    /** get range to another RoomPosition */
    getRangeTo(pos) {
      if (!(pos instanceof RoomPosition)) return ERR_INVALID_ARGS;
      const [tX, tY] = utils.parse(this.roomName),
        [pX, pY] = utils.parse(pos.roomName);
      return Math.max(
        Math.abs(tX * ROOM_WIDTH + this.x - (pX * ROOM_WIDTH + pos.x)),
        Math.abs(tY * ROOM_HEIGHT + this.y - (pY * ROOM_HEIGHT + pos.y))
      );
    }
    /** get recovering data */
    get recover() {
      const recover = [this.x, this.y];
      return recover;
    }
  }

  /** RoomTerrain class defination */
  class RoomTerrain {
    /** stringify array data */
    static compress(data, sep = `,`) {
      return _.join(
        _.map(data, (row) => _.join(_.map(row, utils.symbolOf), ``)),
        sep
      );
    }
    /** parse compressed terrain data */
    static decompress(data, sep = `,`) {
      return _.map(_.split(data, sep), (row) =>
        _.map(_.split(row, ``), utils.meaningOf)
      );
    }
    /** constructor for RoomTerrain */
    constructor(terrain) {
      this.data = terrain.data || RoomTerrain.decompress(terrain);
    }
    /** get terrain at (x, y) or (RoomPosition, ) */
    at(x, y) {
      if (x instanceof RoomPosition) (y = x.y), (x = x.x);
      assert(x >= 0 && x < ROOM_WIDTH, `Invalid x coordinate!`);
      assert(y >= 0 && y < ROOM_HEIGHT, `Invalid y coordinate!`);
      console.log(x, y);
      return this.data[y][x];
    }
    /** get terrain in ASCII Array */
    get array() {
      return _.map(this.data, (row) => _.map(row, utils.symbolOf));
    }
    /** get terrain in String */
    get print() {
      const join = (row) => _.join(row, ``);
      return `|${_.join(_.map(this.array, join), `|\n|`)}|`;
    }
    /** get recovering data */
    get recover() {
      const recover = RoomTerrain.compress(this.data);
      return recover;
    }
  }

  /** constructor for PathFinder */
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
    /** TODO: Optimize performance! */
    /** search for route from origin to goals with A* algorithm */
    search(origin, goal) {
      if (!(goal instanceof Array)) goal = [goal];
      const goals = new Map(),
        heuristics = new Map(),
        moveCosts = new Map(),
        internals = new Map(),
        frontiers = new Queue(),
        heuristic = (pos) => {
          if (!heuristics.has(pos.roomName)) heuristics.set(pos.roomName, []);
          const room = heuristics.get(pos.roomName);
          if (room[pos] != undefined) return room[pos];
          return (room[pos] =
            _.min(_.map(goal, pos.getRangeTo)) * this.heuristicWeight);
        },
        moveCost = (pos) => {
          if (!moveCosts.has(pos.roomName))
            moveCosts.set(pos.roomName, this.roomCallback(pos.roomName));
          return moveCosts.get(pos.roomName);
        },
        explore = (pos, ppos, dir, dis, heu) => {
          if (!internals.has(pos.roomName)) internals.set(pos.roomName, []);
          const room = internals.get(pos.roomName);
          if (room[pos] === undefiend || _.head(room[pos]) > score) {
            room[pos] = [dis, dir, ppos];
            frontiers.push([dis + heu, dis, pos]);
          }
        },
        reconstruct = (pos, info, path = [], poss = []) => {
          poss.unshift(pos);
          if (_.isEqual(pos, origin))
            return Object.assign(info, { path, poss });
          const room = internals.get(pos.roomName),
            [_dis, dir, ppos] = room[pos];
          path.unshift(dir);
          return reconstruct(ppos, info, path, poss);
        };
      _.forEach(goal, (pos) => {
        if (!goals.has(pos.roomName)) goals.set(pos.roomName, new Set());
        const room = goals.get(pos.roomName);
        room.add(Number(pos));
      });
      let [range, cost, ops, nearest] = [heuristic(origin), 0, 0, origin];
      frontiers.push([heu, 0, origin]);
      for (; ops < this.maxOps; ops++) {
        const top = frontier.pop();
        if (top === undefined) break;
        const [score, dis, pos] = top;
        if (range > score - dis)
          [range, cost, nearest] = [score - dis, dis, pos];
        const room = goals.get(pos.roomName);
        if (room !== undefined && room.has(Number(pos))) break;
        _.forEach(utils.dirs, (dir) => {
          const npos = move(pos.clone(), dir).clamp();
          explore(npos, pos, dir, dis + moveCost(npos), heuristic(npos));
        });
      }
      const incomplete = range > 0;
      return reconstruct(nearest, { ops, cost, incomplete });
    }
  }

  /** RoomObject class defination */
  class RoomObject {
    /** constructor for RoomObject */
    constructor(data, id, room) {
      this.id = id;
      this.room = room;

      this.pos = new RoomPosition(data.pos, this.room.name);
      this.hits = data.hits;
      this.hitsMax = data.hitsMax;
    }
    /** schedule player action */
    schedule(callback) {
      engine.schedule.set(this.id, callback);
      return this;
    }
    /** update scheduled action */
    update() {
      this.pos = this.pos.clamp();
      if (this.room.name != this.pos.roomName) {
        if (this instanceof Creep) delete this.room.creeps[this.name];
        if (this instanceof Structure) delete this.room.structures[this.id];
        this.room = context.Game.rooms[this.pos.roomName];
        if (this instanceof Creep) this.room.creeps[this.name] = this;
        if (this instanceof Structure) this.room.structures[this.id] = this;
      }
      if (!engine.schedule.has(this.id)) return;
      const callback = engine.schedule.get(this.id);
      assert(_.isFunction(callback), `Invalid action name!`);
      return callback.call(this, ...arguments);
    }
    /** get recovering data */
    get recover() {
      const recover = {};
      recover.pos = this.pos.recover;
      recover.hits = this.hits;
      recover.hitsMax = this.hitsMax;
      return recover;
    }
  }

  /** Store class defination */
  class Store {
    /** constructor for Store */
    constructor(data, limit, capacity) {
      this.store = data.store || data;
      this.limit = data.limit || limit;
      this.capacity = data.capacity || capacity;
    }
    /** get capacity for certain type of resources */
    getCapacity(type) {
      if (type === undefined || _.includes(this.limit, type))
        return this.capacity;
      return 0;
    }
    /** set capacity */
    setCapacity(amount) {
      return (this.capacity = amount);
    }
    /** add capacity */
    addCapacity(amount) {
      return this.setCapacity(this.getCapacity() + amount);
    }
    /** get used amount for certain type of resources */
    getUsed(type) {
      if (type !== undefined) return this.store[type] || 0;
      return _.sum(_.values(this.store));
    }
    /** set used amount for certain type of resources */
    setUsed(type, amount) {
      return (this.store[type] = amount);
    }
    /** add used amount for certain type of resources */
    addUsed(type, amount) {
      return this.setUsed(type, this.getUsed(type) + amount);
    }
    /** get free capacity for certain type of resources */
    getFree(type) {
      return this.getCapacity(type) - this.getUsed(type);
    }
    /** get recovering data */
    get recover() {
      const recover = this.store;
      return recover;
    }
  }

  /** Creep class defination inherited from RoomObject */
  class Creep extends RoomObject {
    /** constructor for Creep */
    constructor(data, name, room) {
      super(data, data.id, room);
      this.name = name;

      this.head = data.head;
      this.body = data.body;
      this.fatigue = data.fatigue;
      this.owner = data.owner;
      this.my = this.owner === player.name;
      this.store = new Store(
        data.store,
        [RESOURCE_ENERGY],
        this.getActiveBodyparts(CARRY) * CARRY_CAPACITY
      );
    }
    /** update creep state */
    update() {
      super.update(...arguments);

      this.fatigue -= this.getActiveBodyparts(MOVE) * (MOVE_POWER + 1);
      if (this.fatigue < 0) this.fatigue = 0;
    }
    /** get Memory.creeps[name] */
    get memory() {
      const creeps = (context.Memory.creeps = context.Memory.creeps || {});
      return (creeps[this.name] = creeps[this.name] || {});
    }
    /** get active bodyparts of certain type */
    getActiveBodyparts(bodypart) {
      const filter = bodypart ? (part) => part === bodypart : (part) => true;
      return _.sumBy(this.body, filter);
    }
    /**
     * Schedule Creep move by direction
     * @param {string} dir direction to move towards
     * @returns {string} OK or ERR codes
     * @example
     *   const John = Game.creeps.John,
     *     ret = John.move(TOP);
     *   if (ret === OK)
     *     console.log(`John will move towards TOP`);
     */
    move(dir) {
      if (!this.my) return ERR_NOT_OWNER;
      if (!this.getActiveBodyparts(MOVE)) return ERR_NO_BODYPART;
      if (!_.includes(utils.dirs, dir)) return ERR_INVALID_ARGS;
      if (this.fatigue > 0) return ERR_TIRED;
      const pos = this.pos.clone().move(dir),
        objects = pos.look();
      console.log(_.head(objects));
      if (_.head(objects) === TERRAIN_WALL) return ERR_NO_PATH;
      if (!_.every(_.tail(objects), `walkable`)) return ERR_NO_PATH;
      this.schedule(function () {
        this.head = dir;
        this.pos = pos;
      });
      return OK;
    }
    /**
     * Schedule Creep move by path
     * @param {[string]} path Array of directions as path
     * @returns {string} OK or ERR codes
     * @returns {string} OK or ERR codes
     * @example
     *   const John = Game.creeps.John,
     *     ret = John.move(TOP);
     *   if (ret === OK)
     *     console.log(`John will move towards TOP`);
     */
    moveByPath(path) {}
    /** get recovering data */
    get recover() {
      const recover = super.recover;
      recover.id = this.id;
      recover.head = this.head;
      recover.body = this.body;
      recover.fatigue = this.fatigue;
      recover.owner = this.owner;
      recover.store = this.store.recover;
      return recover;
    }
  }

  // /** Creep.moveByPath */
  // Creep.prototype.moveByPath = function (path) {
  //   if (!(path instanceof Array)) return ERR_INVALID_ARGS;
  //   const dir = _.head(path);
  //   if (dir === undefined) return ERR_NO_PATH;
  //   return this.move(dir);
  // };

  // /** Creep.moveTo */
  // Creep.prototype.moveTo = function (pos, opts = {}, arg = {}) {
  //   if (!(pos instanceof RoomPosition)) {
  //     if (pos.pos instanceof RoomPosition) pos = pos.pos;
  //     else (pos = new RoomPosition(pos, opts, this.room.name)), (opts = arg);
  //   }
  //   if (pos === undefined || pos === null) return ERR_INVALID_ARGS;
  //   if (_.isEqual(this.pos, pos)) return OK;
  //   const serializeMemory =
  //     opts.serializeMemory || opts.serializeMemory === undefined;
  //   let path = this.memory._move;
  //   if (serializeMemory) path = _.map(path, (code) => utils.dirs[code]);
  //   const noPathFinding = opts.noPathFinding,
  //     reusePath = opts.reusePath || 5;
  //   if (_.head(path) === undefined && !noPathFinding)
  //     path = _.take(new PathFinder().search(this.pos, pos).path, reusePath);
  //   const ret = this.moveByPath(path);
  //   if (ret === OK) path = _.tail(path);
  //   if (serializeMemory)
  //     (path = _.map(path, (dir) => utils.dirCodes[dir])),
  //       (path = _.join(path, ``));
  //   this.memory._move = path;
  //   return ret;
  // };

  /** Structure class defination inherited from RoomObjects */
  class Structure extends RoomObject {
    static new(data, ...args) {
      const constructor = context[`Structure${data.structureType}`];
      return new constructor(data, ...args);
    }
    /** constructor for Structure */
    constructor(data) {
      super(...arguments);

      this.structureType = data.structureType;
      this.walkable = !_.includes(OBSTACLE_OBJECT_TYPES, this.structureType);
    }
    /** update structure state */
    update() {
      super.update(...arguments);
    }
    /** get recovering data */
    get recover() {
      const recover = super.recover;
      recover.structureType = this.structureType;
      return recover;
    }
  }

  /** StructureController class defination inherited from Structure */
  class StructureController extends Structure {
    static new(room) {
      let id = room.engine.RNG.randhex,
        pos = room.select;
      if (!(pos instanceof RoomPosition)) return null;
      else pos = pos.recover;
      const structureType = STRUCTURE_CONTROLLER,
        controller = new StructureController(room, { pos, structureType }, id);
      room.structures[id] = controller;
      return controller;
    }
    /** constructor for StructureController */
    constructor(data, _id, room) {
      super(...arguments);

      this.level = data.level;
      this.progress = data.progress;
      this.progressTotal = CONTROLLER_LEVELS[this.level];

      room.controller = this;
    }
    /** update state */
    update() {
      super.update(...arguments);

      if (this.progress >= this.progressTotal) {
        this.progress -= this.progressTotal;
        this.progressTotal = CONTROLLER_LEVELS[++this.level];
      }
    }
    /** get recovering data */
    get recover() {
      const recover = super.recover;
      recover.level = this.level;
      recover.progress = this.progress;
      recover.progressTotal = this.progressTotal;
      return recover;
    }
  }

  /** StructureSource class defination inherited from Structure */
  class StructureSource extends Structure {
    static new(room) {
      let id = room.engine.RNG.randhex,
        pos = room.select;
      if (!(pos instanceof RoomPosition)) return null;
      else pos = pos.recover;
      const structureType = STRUCTURE_SOURCE,
        source = new StructureSource(room, { pos, structureType }, id);
      room.structures[id] = source;
      return source;
    }
    /** constructor for StructureSource */
    constructor(data) {
      super(...arguments);

      this.ticksToRegeneration = data.ticksToRegeneration;
      this.store = new Store(data.store, [RESOURCE_ENERGY], SOURCE_CAPACITY);
    }
    /** update state */
    update() {
      super.update(...arguments);

      if (--this.ticksToRegeneration <= 0) {
        this.ticksToRegeneration = SOURCE_REGEN_TIME;
        this.store.setUsed(RESOURCE_ENERGY, SOURCE_CAPACITY);
      }
    }
    /** get recovering data */
    get recover() {
      const recover = super.recover;
      recover.store = this.store.recover;
      recover.ticksToRegeneration = this.ticksToRegeneration;
      return recover;
    }
  }

  /** OwnedStructure class defination inherited from Structure */
  class OwnedStructure extends Structure {
    /** constructor for OwnedStructure */
    constructor(data) {
      super(...arguments);

      this.owner = data.owner;
      this.my = this.owner === player.name;
    }
    /** get Memory.structures[id] */
    get memory() {
      const structures = (context.Memory.structures =
        context.Memory.structures || {});
      return (structures[this.id] = structures[this.id] || {});
    }
  }

  /** StructureSpawn class defination inherited from OwnedStructure */
  class StructureSpawn extends Structure {
    /** constructor for StructureSpawn */
    constructor(data) {
      super(...arguments);

      this.name = data.name;
      this.store = new Store(
        data.store,
        [RESOURCE_ENERGY],
        SPAWN_ENERGY_CAPACITY
      );
    }
    /** update state */
    update() {
      super.update(...arguments);

      this.store.add(RESOURCE_ENERGY, SPAWN_ENERGY_GENERATION_RATE);
      if (this.getUsed(RESOURCE_ENERGY) >= SPAWN_ENERGY_CAPACITY)
        this.store.set(RESOURCE_ENERGY, SPAWN_ENERGY_CAPACITY);
    }
    /** spawnCreep */
    spawnCreep(body, name, opts) {
      if (name === undefined) return ERR_INVALID_ARGS;
      if (_.sumBy(body, (bodypart) => !_.includes(CREEP_BODYPARTS, bodypart)))
        return ERR_INVALID_ARGS;
      if (this.engine.creeps[name] !== undefined) return ERR_NAME_EXISTS;
      const poss = _.pickBy(
        _.mapValues(utils.dirs, (dir) => {
          const pos = this.move(dir);
          if (pos instanceof RoomPosition) return pos;
        })
      );
      if (_.isEmpty(poss)) return ERR_NO_PATH;
      const [dir, pos] = this.engine.RNG.select(poss);
      (this.action = `spawnCreep_`), (this.args = [dir, pos, body, name, opts]);
      return OK;
    }
    spawnCreep_(head, pos, body, name, opts) {
      const id = this.engine.RNG.randhex,
        store = {},
        fatigue = 0;
      Creep.new(this.room, { pos, id, head, body, fatigue, store }, name);
    }
    /** get recovering data */
    get recover() {
      const recover = super.recover;
      recover.store = this.store.recover;
      return recover;
    }
  }

  /** export constants */
  Object.assign(context, constants);

  /** export constructors */
  context.Room = Room;
  context.RoomPosition = RoomPosition;
  context.RoomTerrain = RoomTerrain;
  context.PathFinder = PathFinder;
  context.RoomObject = RoomObject;
  context.Store = Store;
  context.Creep = Creep;
  context.Structure = Structure;
  context.StructureController = StructureController;
  context.StructureSource = StructureSource;
  context.OwnedStructure = OwnedStructure;
  context.StructureSpawn = StructureSpawn;

  /** export Game & Memory */
  context.Game = new Game();
  context.Memory = new Memory();

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
}
module.exports.create = create;

function reduce(context, engine, player) {
  // const Game = context.Game;
  // _.forEach(Game.creeps, (creep) => {});

  const RoomPosition = context.RoomPosition;
  delete RoomPosition.prototype.roomX;
  delete RoomPosition.prototype.roomY;
  delete RoomPosition.prototype.clone;
  delete RoomPosition.prototype.move;
  delete RoomPosition.prototype.clamp;
  delete RoomPosition.prototype.recover;

  const Store = context.Store;
  delete Store.prototype.setCapacity;
  delete Store.prototype.addCapacity;
  delete Store.prototype.setUsed;
  delete Store.prototype.addUsed;
  delete Store.prototype.recover;

  const Room = context.Room;
  delete Room.prototype.find;
  delete Room.prototype.recover;
}
module.exports.reduce = reduce;
