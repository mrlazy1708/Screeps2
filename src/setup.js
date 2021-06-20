`use strict`;

const _ = require(`lodash`);
const assert = require(`assert/strict`);
const constants = require(`./constants`);
const utils = require(`./utils`);
const Queue = require(`./queue`);

/** construct prototypes for player from engine under context */
function create(context, engine, player) {
  /** hidden Map for room objects */
  const _creeps = new Map(),
    _structures = new Map();
  function addCreep(room, creep) {
    _creeps.get(room.name)[creep.name] = creep;
    context.Game.creeps[creep.name] = creep;
  }
  function deleteCreep(room, creep) {
    delete _creeps.get(room.name)[creep.name];
    delete context.Game.creeps[creep.name];
  }
  function addStructure(room, structure) {
    _structures.get(room.name)[structure.id] = structure;
    context.Game.structures[structure.id] = structure;
  }
  function deleteStructure(room, structure) {
    delete _structures.get(room.name)[structure.id];
    delete context.Game.structures[structure.id];
  }

  /**
   * The main global game object containing all the game play information.
   *
   */
  class Game {
    constructor() {
      this.time = engine.Game.time;

      /** Game.rooms */
      this.rooms = _.mapValues(
        _.pickBy(engine.Game.rooms, player.visible),
        (room, name) => new Room(room, name)
      );

      /** Game.creeps */
      this.creeps = _.merge({}, ..._creeps.values());

      /** Game.structures */
      this.structures = _.merge({}, ..._structures.values());

      /** Game.spawns */
      const isSpawn = (structure) => structure instanceof StructureSpawn;
      this.spawns = _.mapKeys(_.pickBy(this.structures, isSpawn), `name`);
    }

    /**
     * Get an **RoomObject** with the specified unique ID.
     * Only objects from the rooms which are visible to you can be accessed.
     *
     * @param {string} id The unique identificator.
     *
     * @returns {RoomObject} An object instance or undefined if it cannot be found.
     *
     * @example
     * creep.memory.sourceId = creep.pos.findClosestByRange(FIND_SOURCES).id;
     * const source = Game.getObjectById(creep.memory.sourceId);
     *
     */
    getObjectById(id) {
      const creeps = _.mapKeys(this.creeps, `id`),
        structures = this.structures;
      return creeps[id] || structures[id];
    }

    /** INTERNAL */
    recover() {
      const recover = {};
      recover.time = this.time;
      recover.rooms = _.mapValues(this.rooms, (room) => room.recover());
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete Game.prototype.recover;
      delete Game.prototype.reduce;
    }
  }

  /**
   * A global plain object which can contain arbitrary data.
   * You can access it using the **Memory** API.
   *
   * @todo Add UI Memory interface.
   *
   */
  class Memory {
    /** INTERNAL */
    static reduce() {
      delete Memory.prototype.reduce;
    }
  }

  /**
   * An object representing the room in which your units and structures are in.
   * It can be used to look around, find paths, etc.
   * Every RoomObject in the room contains its linked Room instance in the room property.
   *
   * @todo Add RoomVisual.
   * @todo Add getEnergyAvaliable.
   *
   */
  class Room {
    constructor(data, name) {
      this.name = name;

      this.terrain = new RoomTerrain(data.terrain);

      this.controller = null;

      this.creeps = _.mapValues(
        data.creeps,
        (creep, name) => new Creep(creep, name, this)
      );
      _creeps.set(this.name, this.creeps);

      this.structures = _.mapValues(data.structures, (structure, id) =>
        Structure.new(structure, id, this)
      );
      _structures.set(this.name, this.structures);
    }

    /** INTERNAL */
    static new(X, Y, walls, swamps) {
      const name = RoomPosition.prototype.setXY(X, Y);

      const raw = _.map(Array(ROOM_HEIGHT), () =>
          Array(ROOM_WIDTH).fill(TERRAIN_PLAIN)
        ),
        setTerrain = (data, value) =>
          _.forEach(data, (row, y) =>
            _.forEach(row, (sym, x) => {
              if (!sym) raw[y][x] = value;
            })
          ),
        rX = X + (WORLD_WIDTH >> 1),
        rY = Y + (WORLD_HEIGHT >> 1);
      setTerrain(swamps[rY][rX].data, TERRAIN_SWAMP);
      setTerrain(walls[rY][rX].data, TERRAIN_WALL);
      const terrain = new RoomTerrain({ data: raw });

      const creeps = {};

      const structures = {};

      const room = new Room({ terrain, creeps, structures }, name);
      engine.Game.rooms[name] = room;
      return room;
    }

    /** INTERNAL */
    update() {}

    /**
     * A shorthand to Memory.rooms[room.name].
     * You can use it for quick access the **Room**'s specific memory data object.
     *
     * @returns {Memory} Memory.rooms[this.name]
     *
     * @example
     * room.memory.underAttack = true;
     *
     */
    get memory() {
      const rooms = (context.Memory.rooms = context.Memory.rooms || {});
      return (rooms[this.name] = rooms[this.name] || {});
    }

    /**
     * Get the list of objects at the given room position.
     *
     * @param {RoomPosition|number} pos Can be a **RoomPosition** instance or any object containing **RoomPosition**.
     * @param {?number} arg The y coordinate if **pos** is the x coordinate.
     *
     * @returns {[RoomObject|string]} An array with objects at the specified position in the following format:\
     * [\
     *   **TERRAIN_***,\
     *   ...[**Creep**],\
     *   ...[**Structure**]\
     * ]
     *
     * @example
     * const objects = creep.room.at(target);
     * _.forEach(objects, (object) => {
     *   if(object instanceof Creep &&
     *     object.getActiveBodyparts(ATTACK) == 0) {
     *     creep.say(`I will attack creep ${object.name}!`);
     *     creep.moveTo(object);
     *   }
     * });
     *
     */
    at(pos, arg) {
      if (!(pos instanceof RoomPosition))
        pos = new RoomPosition(pos, arg, this.name);
      const terrain = this.terrain.at(pos),
        creeps = _.filter(_creeps.get(this.name), { pos: pos }),
        structures = _.filter(_structures.get(this.name), { pos: pos });
      return _.concat([terrain], creeps, structures);
    }

    /**
     * Find all objects of the specified type in the room.
     *
     * @param {string} type One of the **FIND_*** constants.
     * @param {?object} opts An object with additional options:\
     * **filter** The result list will be filtered using the Lodash.filter method.
     *
     * @returns {[RoomObject]} An array with the objects found.
     *
     * @example
     * const targets = creep.room.find(FIND_DROPPED_RESOURCES);
     * if(targets.length) {
     *     creep.moveTo(_.head(targets));
     *     creep.pickup(_.head(targets));
     * }
     *
     * @todo Complete opts.
     *
     */
    find(type, opts = {}) {
      const creeps = _creeps.get(this.name),
        structures = _structures.get(this.name);
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

    /**
     * Total amount of energy available in all spawns and extensions in the room.
     *
     */
    get energyAvailable() {
      const pred = (structure) => structure instanceof StructureSpawn,
        energyStructures = _.filter(_structures.get(this.name), pred),
        get = (structure) => structure.store.getUsed(RESOURCE_ENERGY);
      return _.sum(energyStructures, get);
    }

    /** Total amount of energyCapacity of all spawns and extensions in the room. */
    get energyCapacity() {
      const pred = (structure) => structure instanceof StructureSpawn,
        energyStructures = _.filter(_structures.get(this.name), pred),
        get = (structure) => structure.store.getCapacity(RESOURCE_ENERGY);
      return _.sum(energyStructures, get);
    }

    /** INTERNAL */
    array() {
      const array = this.terrain.array(),
        draw = (object) => {
          const pos = object.pos;
          console.log(pos, utils.symbol(object));
          array[pos.y][pos.x] = utils.symbol(object);
        };
      _.forEach(_creeps.get(this.name), draw);
      _.forEach(_structures.get(this.name), draw);
      return array;
    }

    /** INTERNAL */
    print() {
      const join = (row) => _.join(row, ``);
      return `|${_.join(_.map(this.array(), join), `|\n|`)}|`;
    }

    /** INTERNAL */
    recover() {
      const recover = {};
      recover.terrain = this.terrain.recover();
      recover.creeps = _.mapValues(this.creeps, (creep) => creep.recover());
      recover.structures = _.mapValues(this.structures, (structure) =>
        structure.recover()
      );
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete Room.prototype.new;
      delete Room.prototype.update;
      delete Room.prototype.array;
      delete Room.prototype.print;
      delete Room.prototype.recover;
      delete Room.prototype.reduce;
    }
  }

  /**
   * An object representing the specified position in the room.
   * Every RoomObject in the room contains RoomPosition as the pos property.
   * The position object of a custom location can be obtained using the Room.getPositionAt method or using the constructor.
   *
   * @todo Manage method visiablity.
   *
   */
  class RoomPosition {
    constructor(x, y, roomName) {
      assert(!_.isUndefined(x) && !_.isNull(x), `Invalid arguments!`);
      if (_.isString(x.roomName))
        return new RoomPosition(x.x, x.y, roomName || x.roomName);
      assert(x >= 0 && x < ROOM_WIDTH, `Invalid x coordinate ${x}!`);
      assert(y >= 0 && y < ROOM_HEIGHT, `Invalid y coordinate ${y}!`);
      assert.match(roomName, /[WE]\d+[NS]\d+/, `Invalid roomName ${roomName}!`);
      this.x = x;
      this.y = y;
      this.roomName = roomName;
    }

    /** convert to number */
    get [Symbol.toPrimitive]() {
      return (pref) => {
        if (pref === `default` || pref === `string`)
          return `[${this.roomName}: (${this.x}, ${this.y})]`;
        if (pref === `number`) return this.x + this.y * ROOM_WIDTH;
      };
    }

    /** get X coordinate in roomName */
    getX() {
      const [__, quad, coor] = /([WE])(\d+)[NS]\d+/.exec(this.roomName);
      if (quad === `W`) return -1 - Number(coor);
      if (quad === `E`) return Number(coor);
    }

    /** set X coordinate in roomName */
    setX(X) {
      const [__, rest] = /[WE]\d+([NS]\d+)/.exec(this.roomName);
      return (this.roomName = `${X >= 0 ? `E${X}` : `W${-1 - X}`}${rest}`);
    }

    /** get Y coordinate in roomName */
    getY() {
      const [__, quad, coor] = /[WE]\d+([NS])(\d+)/.exec(this.roomName);
      if (quad === `N`) return -1 - Number(coor);
      if (quad === `S`) return Number(coor);
    }

    /** set Y coordinate in roomName */
    setY(Y) {
      const [__, rest] = /([WE]\d+)[NS]\d+/.exec(this.roomName);
      return (this.roomName = `${rest}${Y >= 0 ? `S${Y}` : `N${-1 - Y}`}`);
    }

    /** get [X, Y] coordinate in roomName */
    getXY() {
      const [__, qx, nx, qy, ny] = /([WE])(\d+)([NS])(\d+)/.exec(this.roomName),
        Y = qy === `N` ? -1 - Number(ny) : Number(ny),
        X = qx === `W` ? -1 - Number(nx) : Number(nx);
      return [X, Y];
    }

    /** set [X, Y] coordinate in roomName */
    setXY(X, Y) {
      const nameX = `${X >= 0 ? `E${X}` : `W${-1 - X}`}`,
        nameY = `${Y >= 0 ? `S${Y}` : `N${-1 - Y}`}`;
      return nameX + nameY;
    }

    /**
     * Get the list of objects here.\
     * See Room.at.
     *
     */
    look() {
      const room = context.Game.rooms[this.roomName];
      assert(room !== undefined, `Invalid wild RoomPosition`);
      return room.at(this);
    }

    /**
     * Detach and clone a **RoomPosition** instance.
     *
     * @returns {RoomPosition} A duplicate of instance.
     *
     */
    clone() {
      return new RoomPosition(this, this.roomName);
    }

    /**
     * Move **RoomPosition** instance towards direction.
     *
     * @note This method modifies instance **in place**
     *
     * @param {string} dir The direction to move towards.
     *
     * @returns {RoomPosition} Moved instance.
     *
     */
    move(dir) {
      const [dx, dy] = utils.dxdy[dir];
      (this.x += dx), (this.y += dy);
      return this;
    }

    /**
     * Clamp RoomPosition over boundaries.
     *
     */
    clamp(minX = 0, minY = 0, maxX = ROOM_WIDTH - 1, maxY = ROOM_HEIGHT - 1) {
      if (this.x <= minX) {
        const X = this.getX() - 1;
        if (-X * 2 <= WORLD_WIDTH) this.setX(X), (this.x = maxX);
        else assert(this.x === minX, `Move into the wild!`);
      } else if (this.x >= maxX) {
        const X = this.getX() + 1;
        if (X * 2 < WORLD_WIDTH) this.setX(X), (this.x = minX);
        else assert(this.x === maxX, `Move into the wild!`);
      }
      if (this.y <= minY) {
        const Y = this.getY() - 1;
        if (-Y * 2 <= WORLD_HEIGHT) this.setY(Y), (this.y = maxY);
        else assert(this.y === minY, `Move into the wild!`);
      } else if (this.y >= maxY) {
        const Y = this.getY() + 1;
        if (Y * 2 < WORLD_HEIGHT) this.setY(Y), (this.y = minY);
        else assert(this.y === maxY, `Move into the wild!`);
      }
      return this;
    }

    /**
     * Get linear range to the specified position.
     *
     * @param {RoomPosition} pos Can be a RoomPosition object or any object containing RoomPosition.
     *
     * @return {number} The number of squares to the given position.
     *
     * @example
     * const range = creep.pos.getRangeTo(target);
     * if(range <= 3) {
     *     creep.rangedAttack(target);
     * }
     *
     */
    getRangeTo(pos) {
      assert(!_.isUndefined(pos) && !_.isNull(pos), `Invalid pos ${pos}!`);
      if (!(pos instanceof RoomPosition)) pos = pos.pos;
      assert(pos instanceof RoomPosition, `Invalid pos ${pos}!`);
      const [[tX, tY], [pX, pY]] = [this.getXY(), pos.getXY()];
      return Math.max(
        Math.abs(tX * ROOM_WIDTH + this.x - (pX * ROOM_WIDTH + pos.x)),
        Math.abs(tY * ROOM_HEIGHT + this.y - (pY * ROOM_HEIGHT + pos.y))
      );
    }

    /** INTERNAL */
    recover() {
      const recover = [this.x, this.y];
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete RoomPosition.prototype.recover;
      delete RoomPosition.prototype.reduce;
    }
  }

  /**
   * An object which provides fast access to room terrain data.
   *
   */
  class RoomTerrain {
    constructor(terrain) {
      this.data = terrain.data || RoomTerrain.decompress(terrain);
    }

    /** INTERNAL */
    static compress(data, sep = `,`) {
      return _.join(
        _.map(data, (row) => _.join(_.map(row, utils.symbol), ``)),
        sep
      );
    }

    /** INTERNAL */
    static decompress(data, sep = `,`) {
      return _.map(_.split(data, sep), (row) =>
        _.map(_.split(row, ``), utils.meaning)
      );
    }

    /**
     * Get terrain type at the specified room position by (x, y) coordinates
     * or given **RoomPosition** instance.
     *
     * @param {RoomPosition|number} x X position in the room or **RoomPosition** instance.
     * @param {?number} x Y position in the room.
     *
     * @returns {stirng} One of the **TERRAIN_*** constant.
     *
     */
    at(x, y) {
      if (x instanceof RoomPosition) (y = x.y), (x = x.x);
      assert(x >= 0 && x < ROOM_WIDTH, `Invalid x coordinate!`);
      assert(y >= 0 && y < ROOM_HEIGHT, `Invalid y coordinate!`);
      return this.data[y][x];
    }

    /** INTERNAL */
    array() {
      return _.map(this.data, (row) => _.map(row, utils.symbol));
    }

    /** INTERNAL */
    print() {
      const join = (row) => _.join(row, ``);
      return `|${_.join(_.map(this.array(), join), `|\n|`)}|`;
    }

    /** INTERNAL */
    recover() {
      const recover = RoomTerrain.compress(this.data);
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete RoomTerrain.prototype.compress;
      delete RoomTerrain.prototype.decompress;
      delete RoomTerrain.prototype.array;
      delete RoomTerrain.prototype.print;
      delete RoomTerrain.prototype.recover;
      delete RoomTerrain.prototype.reduce;
    }
  }

  /**
   * Contains powerful methods for pathfinding in the game world.
   * This class is written in fast JavaScript code and supports
   * custom navigation costs and paths which span multiple rooms.
   *
   * @todo Add range option
   * @todo Add flee option
   * @todo Optimize performance
   * @todo Complete docs
   *
   */
  class PathFinder {
    /**
     * Constructor for PathFinder.
     *
     * @param {object} opts An object containing additional pathfinding flags.\
     * **moveCost** \
     * **roomCallback** Request from the pathfinder to generate a CostMatrix for a certain room.
     * The callback accepts one argument, roomName.
     * This callback will only be called once per room per search.
     * If you are running multiple pathfinding operations in a single room and in a single tick you may consider caching your CostMatrix to speed up your code.
     * If you return false from the callback the requested room will not be searched, and it won't count against maxRooms.\
     * **maxOps** The maximum allowed pathfinding operations.
     * The default value is 2000.\
     * **maxCost** The maximum allowed cost of the path returned.
     * If at any point the PathFinder detects that it is impossible to find a path with a cost less than or equal to maxCost it will immediately halt the search.
     * The default is Infinity.\
     * **heuristicWeight** Weight to apply to the heuristic in the A* formula F = G + weight * H.
     * Use this option only if you understand the underlying A* algorithm mechanics!
     * The default value is 1.2.
     *
     */
    constructor(opts = {}) {
      this.moveCost = {
        [TERRAIN_PLAIN]: opts.plainCost || MOVE_COST[TERRAIN_PLAIN],
        [TERRAIN_SWAMP]: opts.swampCost || MOVE_COST[TERRAIN_SWAMP],
        [TERRAIN_WALL]: opts.wallCost || MOVE_COST[TERRAIN_WALL],
      };
      const defaultCallback = (roomName) => {
        const room = context.Game.rooms[roomName],
          terrain = room.terrain,
          cost = _.map(_.flatten(terrain.data), (sym) => this.moveCost[sym]),
          set = (object) => (cost[+object.pos] = Infinity);
        _.forEach(room.find(FIND_CREEPS), set);
        _.forEach(room.find(FIND_STRUCTURES), set);
        return cost;
      };
      this.roomCallback = (roomName) => {
        const rooms = context.Game.rooms;
        assert(roomName in rooms, `Room ${roomName} is out of boundray!`);
        return (opts.roomCallback || defaultCallback)(roomName);
      };
      this.flee = opts.flee || false;
      this.maxOps = opts.maxOps || 2000;
      this.maxCost = opts.maxCost || Infinity;
      this.heuristicWeight = opts.heuristicWeight || 1.2;
    }

    /**
     * Search for optimial route from origin to goals with A* algorithm
     *
     * @param {RoomPosition} origin The start position.
     * @param {RoomPosition|[RoomPosition]} goal A goal or an array of goals. If more than one goal is supplied then the cheapest path found out of all the goals will be returned.
     *
     * @returns {object} An object containing the following properties:\
     * **path** An array of RoomPosition objects.\
     * **ops**	Total number of operations performed before this path was calculated.\
     * **cost** The total cost of the path as derived from plainCost, swampCost and any given CostMatrix instances.\
     * **incomplete** If the pathfinder fails to find a complete path, this will be true.
     * Note that path will still be populated with a partial path which represents the closest path it could find given the search parameters.
     *
     * @example
     * const creep = Game.creeps.John,
     *   sources = _.filter(Game.structures, {structureType: STRUCUTRE_SOURCE});
     *
     * const ret = new PathFinder().search(creep.pos, sources);
     * if (ret.incomplete) creep.say(`I can't move to sources!`);
     * else {
     *   creep.say(`Moving towards sources!`);
     *   creep.moveByPath(ret.path);
     * }
     *
     */
    search(origin, goal) {
      if (!(goal instanceof Array)) goal = [goal];
      goal = _.map(goal, (target) =>
        target instanceof RoomPosition ? target : target.pos
      );
      const goals = new Map(),
        heuristics = new Map(),
        moveCosts = new Map(),
        internals = new Map(),
        frontiers = new Queue(),
        heuristic = (pos) => {
          if (!heuristics.has(pos.roomName)) heuristics.set(pos.roomName, []);
          const room = heuristics.get(pos.roomName);
          if (room[+pos] != undefined) return room[+pos];
          room[+pos] =
            _.min(_.map(goal, pos.getRangeTo.bind(pos))) * this.heuristicWeight;
          return room[+pos];
        },
        moveCost = (pos) => {
          if (!moveCosts.has(pos.roomName))
            moveCosts.set(pos.roomName, this.roomCallback(pos.roomName));
          return moveCosts.get(pos.roomName)[+pos];
        },
        explore = (pos, ppos, dir, dis) => {
          if (!internals.has(pos.roomName)) internals.set(pos.roomName, []);
          const room = internals.get(pos.roomName);
          if (_.isUndefined(room[+pos]) || _.head(room[+pos]) > dis) {
            room[+pos] = [dis, dir, ppos];
            frontiers.push([dis + heuristic(pos), dis, pos]);
          }
        },
        reconstruct = (pos, info, path = [], poss = []) => {
          poss.unshift(pos);
          if (_.isEqual(pos, origin))
            return Object.assign(info, { path, poss });
          const room = internals.get(pos.roomName),
            [_dis, dir, ppos] = room[+pos];
          path.unshift(dir);
          return reconstruct(ppos, info, path, poss);
        };
      _.forEach(goal, (pos) => {
        if (!goals.has(pos.roomName)) goals.set(pos.roomName, new Set());
        const room = goals.get(pos.roomName);
        room.add(Number(pos));
      });
      let [range, cost, ops, nearest] = [heuristic(origin), 0, 0, origin];
      frontiers.push([range, 0, origin]);
      for (; ops < this.maxOps; ops++) {
        const top = frontiers.pop();
        if (_.isUndefined(top)) break;
        const [score, dis, pos] = top;
        if (!_.isFinite(score)) break;
        if (range > score - dis)
          [range, cost, nearest] = [score - dis, dis, pos];
        const room = goals.get(pos.roomName);
        if (room !== undefined && room.has(Number(pos))) break;
        _.forEach(utils.dirs, (dir) => {
          const npos = pos.clone().move(dir);
          explore(npos.clamp(), pos, dir, dis + moveCost(npos));
        });
      }
      const incomplete = range > 0;
      return reconstruct(nearest, { ops, cost, incomplete });
    }

    /** INTERNAL */
    static reduce() {
      delete PathFinder.prototype.reduce;
    }
  }

  /**
   * Any object with a position in a room.
   * Almost all game objects prototypes are derived from RoomObject.
   *
   */
  class RoomObject {
    constructor(data, id, room) {
      Object.defineProperty(this, `id`, {
        configurable: false,
        enumerable: true,
        get: () => id,
        set: () => {
          throw new SyntaxError(`Cannot set id of RoomObject`);
        },
      });

      this.room = room;

      let pos = data.pos;
      if (!(pos instanceof Array)) pos = [pos.x, pos.y];
      this.pos = new RoomPosition(...pos, this.room.name);
      this.hits = data.hits;
      this.hitsMax = data.hitsMax;
    }

    /** INTERNAL */
    update() {
      if (!engine.scheduleMap.has(this.id)) return;
      const [action, args] = engine.scheduleMap.get(this.id);
      assert(_.isFunction(this[action]), `Invalid action ${action}`);
      const ret = this[action](...args);
      if (ret !== OK) {
        console.log1(`Conflict detected!`);
        console.log1(`  ${this.id} ${action} [${args}] returns ${ret}`);
      }

      this.pos = this.pos.clamp();
      if (this.room.name != this.pos.roomName) {
        if (this instanceof Creep) deleteCreep(this.room, this);
        if (this instanceof Structure) deleteStructure(this.room, this);
        this.room = context.Game.rooms[this.pos.roomName];
        if (this instanceof Creep) addCreep(this.room, this);
        if (this instanceof Structure) addStructure(this.room, this);
      }
      return ret;
    }

    /** INTERNAL */
    remove() {}

    /** INTERNAL */
    recover() {
      const recover = {};
      recover.pos = this.pos.recover();
      recover.hits = this.hits;
      recover.hitsMax = this.hitsMax;
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete RoomObject.prototype.update;
      delete RoomObject.prototype.remove;
      delete RoomObject.prototype.recover;
      delete RoomObject.prototype.reduce;
    }
  }

  /**
   * An object that can contain resources in its cargo.
   * Each **Store** has its limitations on the types of resources it can store, determined by its owner.
   *
   */
  class Store {
    constructor(data, limit, capacity) {
      this.store = data.store || data;
      this.limit = data.limit || limit;
      this.capacity = data.capacity || capacity;
    }

    /** get capacity for certain type of resources */
    getCapacity(type) {
      if (_.isUndefined(type) || _.includes(this.limit, type))
        return this.capacity;
      return 0;
    }

    /** INTERNAL */
    setCapacity(amount) {
      return (this.capacity = amount);
    }

    /** INTERNAL */
    addCapacity(amount) {
      return this.setCapacity(this.getCapacity() + amount);
    }

    /** get used amount for certain type of resources */
    getUsed(type) {
      if (type !== undefined) return this.store[type] || 0;
      return _.sum(_.values(this.store));
    }

    /** INTERNAL */
    setUsed(type, amount) {
      return (this.store[type] = amount);
    }

    /** INTERNAL */
    addUsed(type, amount) {
      return this.setUsed(type, this.getUsed(type) + amount);
    }

    /** get free capacity for certain type of resources */
    getFree(type) {
      return this.getCapacity(type) - this.getUsed(type);
    }

    /** INTERNAL */
    recover() {
      const recover = this.store;
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete Store.prototype.setCapacity;
      delete Store.prototype.addCapacity;
      delete Store.prototype.setUsed;
      delete Store.prototype.addUsed;
      delete Store.prototype.recover;
      delete Store.prototype.reduce;
    }
  }

  /**
   * Creeps are your units.
   * Creeps can move, harvest energy, construct structures, attack another creeps, and perform other actions.
   *
   */
  class Creep extends RoomObject {
    constructor(data, name, room) {
      super(data, data.id, room);
      this.name = name;

      this.body = data.body;
      this.owner = data.owner;
      this.my = this.owner === player.name || player.god;
      if ((this.spawning = data.spawning)) {
        this.directions = data.directions;
        this.needTime = this.body.length * CREEP_SPAWN_TIME;
        this.remainingTime = data.remainingTime;
        this.spawn = data.spawn;
      } else {
        this.head = data.head;
        this.fatigue = data.fatigue;
        this.ticksToLive = data.ticksToLive;
        this.store = new Store(
          data.store,
          [RESOURCE_ENERGY],
          this.getActiveBodyparts(CARRY) * CARRY_CAPACITY
        );
      }
    }

    /** INTERNAL */
    static new(room, spawn_, name, directions, body, owner) {
      const id = engine.RNG.randhex(),
        pos = spawn_.pos,
        hitsMax = body.length * CREEP_BODYPART_HITS,
        hits = hitsMax,
        spawning = true,
        remainingTime = body.length * CREEP_SPAWN_TIME,
        spawn = spawn_.name,
        // prettier-ignore
        creep = new Creep({ pos, hits, hitsMax, id, body, owner, spawning,
              directions, remainingTime, spawn}, name, room);
      addCreep(room, creep);
      return creep;
    }

    /** INTERNAL */
    update() {
      super.update(...arguments);

      this.fatigue -= this.getActiveBodyparts(MOVE) * (MOVE_POWER + 1);
      if (this.fatigue <= 0) this.fatigue = 0;

      if (this.spawning) {
        if (this.remainingTime-- === 0) {
          const directions = _.filter(this.directions, (dir) => {
            const spawn = context.Game.spawns[this.spawn];
            if (_.isUndefined(spawn)) return false;
            const look = spawn.pos.clone().move(dir).look();
            return look.length === 1 && _.head(look) !== TERRAIN_WALL;
          });
          if (!_.isEmpty(directions)) {
            this.head = engine.RNG.pick(directions);
            this.pos.move(this.head);
            this.fatigue = 0;
            this.ticksToLive = _.includes(this.body, CLAIM)
              ? CREEP_CLAIM_LIFE_TIME
              : CREEP_LIFE_TIME;
            this.store = new Store(
              { [RESOURCE_ENERGY]: 0 },
              [RESOURCE_ENERGY],
              this.getActiveBodyparts(CARRY) * CARRY_CAPACITY
            );
            this.spawning = false;
            context.Game.spawns[this.spawn].spawning = null;
          }
        }
      } else {
        this.ticksToLive--;
        if (this.ticksToLive <= 0) deleteCreep(this.room, this);
      }
    }

    /**
     * A shorthand to Memory.creeps[creep.name].
     * You can use it for quick access the **Creep**’s specific memory data object.
     *
     * @returns {Memory} Memory.creeps[this.name]
     *
     * @example
     * creep.memory.task = `waitRescue`;
     *
     */
    get memory() {
      const creeps = (context.Memory.creeps = context.Memory.creeps || {});
      return (creeps[this.name] = creeps[this.name] || {});
    }

    /**
     * Get the quantity of active bodyparts of given type.
     *
     * @param {string} bodypart A body part type.
     *
     * @returns {number} A number representing the quantity of body parts.
     *
     * @example
     * const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
     * if(target && target.getActiveBodyparts(ATTACK) === 0) {
     *   creep.moveTo(target);
     *   creep.say(`I'm going to attack ${target.name}!`);
     * }
     *
     */
    getActiveBodyparts(bodypart) {
      const filter = bodypart ? (part) => part === bodypart : (part) => true;
      return _.sumBy(this.body, filter);
    }

    /**
     * Schedule Creep move one square in given direction.
     *
     * @param {string} dir The direction to move towards.
     *
     * @returns {string} OK or ERR codes.
     *
     * @example
     * const John = Game.creeps.John,
     *   ret = John.move(TOP);
     * if (ret === OK)
     *   John.say(`I'm moving towards ${TOP}!`);
     *
     */
    move(dir) {
      if (!this.my) return ERR_NOT_OWNER;
      if (this.spawning) return ERR_NOT_AVAILABLE;
      if (!this.getActiveBodyparts(MOVE)) return ERR_NO_BODYPART;
      if (!_.includes(utils.dirs, dir)) return ERR_INVALID_ARGS;
      if (this.fatigue > 0) return ERR_TIRED;
      const pos = this.pos.clone().move(dir),
        objects = pos.look();
      if (_.head(objects) === TERRAIN_WALL) return ERR_NO_PATH;
      if (!_.every(_.tail(objects), `walkable`)) return ERR_NO_PATH;
      if (player.god) {
        this.head = dir;
        this.pos = new context.RoomPosition(pos);
      } else {
        player.schedule(this, [`move`, [dir]], true);
      }
      return OK;
    }

    /**
     * Schedule Creep move by given predefined path.
     *
     * @note This method modifies original path array **in place**.
     *
     * @param {[string]} path Array of directions as path.
     *
     * @returns {string} OK or ERR codes.
     *
     * @example
     * const path = spawn.room.findPath(spawn, source).path;
     * creep.moveByPath(path);
     */
    moveByPath(path) {
      if (!this.my) return ERR_NOT_OWNER;
      if (this.spawning) return ERR_NOT_AVAILABLE;
      if (!this.getActiveBodyparts(MOVE)) return ERR_NO_BODYPART;
      if (!_.isArray(path)) return ERR_INVALID_ARGS;
      if (path.length === 0) return ERR_NO_PATH;
      return this.move(path.shift());
    }

    /**
     * Schedule Creep move to given target.
     *
     * @param {RoomPosition|RoomObject} target RoomPosition or Object.pos is RoomPosition.
     *
     * @returns {string} OK or ERR codes.
     *
     * @example
     * creep.moveTo(25, 25, {reusePath: 10});
     *
     * @example
     * creep.moveTo(new RoomPosition(25, 20, `W10N5`));
     *
     * @example
     * const source = creep.pos.findClosestByRange(STRUCTURE, {
     *   filter: {structureType: STRUCTURE_SOURCE}
     * });
     * creep.moveTo(source);
     *
     */
    moveTo(target, arg = {}, opts = {}) {
      if (!this.my) return ERR_NOT_OWNER;
      if (this.spawning) return ERR_NOT_AVAILABLE;
      if (!this.getActiveBodyparts(MOVE)) return ERR_NO_BODYPART;
      if (_.isUndefined(target) || _.isNull(target)) return ERR_INVALID_ARGS;
      if (!(target instanceof RoomPosition)) {
        if (target.pos instanceof RoomPosition)
          (target = target.pos), (opts = arg);
        else target = new RoomPosition(target, arg, this.room.name);
      }
      if (!(target instanceof RoomPosition)) return ERR_INVALID_ARGS;
      const serialize = opts.serialize || _.isUndefined(opts.serialize);
      let path = this.memory._path,
        pos = [target];
      if (serialize) path = _.map(path, (code) => utils.dirs[code]);
      const noPathFinding = opts.noPathFinding,
        reusePath = _.isNumber(opts.reusePath) ? opts.reusePath + 1 : 5 + 1;
      if (path.length === 0 && !noPathFinding)
        path = _.take(new PathFinder().search(this.pos, pos).path, reusePath);
      const ret = this.moveByPath(path);
      if (serialize) path = _.map(path, (dir) => utils.dirCodes[dir]).join(``);
      this.memory._path = path;
      return ret;
    }

    /**
     * Schedule Creep harvest Source, Mineral or Deposit
     *
     * @param {RoomObject} target The object to be harvested.
     *
     * @returns {string} OK or ERR codes.
     *
     * @example
     * const target = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
     * if(target && creep.harvest(target) == ERR_NOT_IN_RANGE)
     *   creep.moveTo(target);
     *
     */
    harvest(target) {
      if (!this.my) return ERR_NOT_OWNER;
      if (this.spawning) return ERR_NOT_AVAILABLE;
      if (target instanceof StructureSource) {
        if (!this.getActiveBodyparts(WORK)) return ERR_NO_BODYPART;
        if (this.pos.getRangeTo(target) > HARVEST_RANGE)
          return ERR_NOT_IN_RANGE;
        const amount1 = target.store.getUsed(RESOURCE_ENERGY);
        if (amount1 <= 0) return ERR_NOT_ENOUGH_RESOURCES;
        const amount2 = this.store.getFree(RESOURCE_ENERGY);
        if (amount2 <= 0) return ERR_FULL;
        let amount = this.getActiveBodyparts(WORK) * HARVEST_SOURCE_POWER;
        amount = Math.min(amount, amount1, amount2);
        if (player.god) {
          this.store.addUsed(RESOURCE_ENERGY, amount);
          target.store.addUsed(RESOURCE_ENERGY, -amount);
        } else {
          target = engine.Game.getObjectById(target.id);
          player.schedule(this, [`harvest`, [target]], true);
        }
        return OK;
      }
      return ERR_INVALID_ARGS;
    }

    /**
     * Schedule Creep upgeade controller to next level.
     *
     * @param {StructureController} target The target controller object to be upgraded.
     *
     * @returns {string} OK or ERR codes.
     *
     * @example
     * if(creep.room.controller && creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE)
     *    creep.moveTo(creep.room.controller);
     *
     */
    upgradeController(target) {
      if (!this.my) return ERR_NOT_OWNER;
      if (this.spawning) return ERR_NOT_AVAILABLE;
      if (!this.getActiveBodyparts(WORK)) return ERR_NO_BODYPART;
      if (!(target instanceof StructureController)) return ERR_INVALID_ARGS;
      if (this.pos.getRangeTo(target) > UPGRADE_CONTROLLER_RANGE)
        return ERR_NOT_IN_RANGE;
      const amount1 = this.store.getUsed(RESOURCE_ENERGY);
      if (amount1 <= 0) return ERR_NOT_ENOUGH_RESOURCES;
      let amount = this.getActiveBodyparts(WORK) * UPGRADE_CONTROLLER_POWER;
      amount = Math.min(amount, amount1);
      if (player.god) {
        this.store.addUsed(RESOURCE_ENERGY, -amount);
        target.progress += amount;
      } else {
        target = engine.Game.getObjectById(target.id);
        player.schedule(this, [`upgradeController`, [target]], true);
      }
      return OK;
    }

    /**
     * Kill the creep immediately.
     *
     * @returns {string} OK or ERR codes.
     *
     */
    suicide() {
      if (!this.my) return ERR_NOT_OWNER;
      if (this.spawning) return ERR_NOT_AVAILABLE;
      if (player.god) {
        deleteCreep(this.room, this);
      } else {
        player.schedule(this, [`suicide`, []], true);
      }
      return OK;
    }

    /** INTERNAL */
    recover() {
      const recover = super.recover();
      recover.id = this.id;
      recover.body = this.body;
      recover.owner = this.owner;
      if ((recover.spawning = this.spawning)) {
        recover.directions = this.directions;
        recover.remainingTime = this.remainingTime;
        recover.spawn = this.spawn;
      } else {
        recover.head = this.head;
        recover.fatigue = this.fatigue;
        recover.ticksToLive = this.ticksToLive;
        recover.store = this.store.recover();
      }
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete Creep.prototype.new;
      delete Creep.prototype.update;
      delete Creep.prototype.remove;
      delete Creep.prototype.recover;
      delete Creep.prototype.reduce;
    }
  }

  /** Structure class defination inherited from RoomObjects */
  class Structure extends RoomObject {
    constructor(data) {
      super(...arguments);

      this.structureType = data.structureType;
      this.walkable = _.includes(WALKABLE_OBJECT_TYPES, this.structureType);
    }

    /** INTERNAL */
    static new(data, ...args) {
      const constructor = context[`Structure${data.structureType}`];
      return new constructor(data, ...args);
    }

    /** INTERNAL */
    update() {
      super.update(...arguments);
    }

    /** INTERNAL */
    recover() {
      const recover = super.recover();
      recover.structureType = this.structureType;
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete Structure.prototype.new;
      delete Structure.prototype.update;
      delete Structure.prototype.recover;
      delete Structure.prototype.reduce;
    }
  }

  /** StructureController class defination inherited from Structure */
  class StructureController extends Structure {
    constructor(data, _id, room) {
      super(...arguments);

      this.level = data.level;
      this.progress = data.progress;
      this.progressTotal = CONTROLLER_LEVELS[this.level];

      room.controller = this;
    }

    /** INTERNAL */
    static new(room, pos) {
      if (_.isUndefined(pos)) return null;
      const under = room.at(...pos);
      assert(_.isEqual(under, [TERRAIN_WALL]), `Invalid pos with ${under}`);
      const id = engine.RNG.randhex(),
        structureType = STRUCTURE_CONTROLLER,
        level = 0,
        progress = 0,
        progressTotal = 0,
        data = { pos, structureType, level, progress, progressTotal },
        controller = new StructureController(data, id, room);
      addStructure(room, controller);
      return controller;
    }

    /** INTERNAL */
    update() {
      super.update(...arguments);

      if (this.progress >= this.progressTotal) {
        this.progress -= this.progressTotal;
        this.progressTotal = CONTROLLER_LEVELS[++this.level];
      }
    }

    /** INTERNAL */
    recover() {
      const recover = super.recover();
      recover.level = this.level;
      recover.progress = this.progress;
      recover.progressTotal = this.progressTotal;
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete StructureController.prototype.new;
      delete StructureController.prototype.update;
      delete StructureController.prototype.recover;
      delete StructureController.prototype.reduce;
    }
  }

  /** StructureSource class defination inherited from Structure */
  class StructureSource extends Structure {
    constructor(data) {
      super(...arguments);

      this.ticksToRegeneration = data.ticksToRegeneration;
      this.store = new Store(data.store, [RESOURCE_ENERGY], SOURCE_CAPACITY);
    }

    /** INTERNAL */
    static new(room, pos) {
      if (_.isUndefined(pos)) return null;
      const under = room.at(...pos);
      assert(_.isEqual(under, [TERRAIN_WALL]), `Invalid pos with ${under}`);
      const id = engine.RNG.randhex(),
        structureType = STRUCTURE_SOURCE,
        ticksToRegeneration = 0,
        store = { [RESOURCE_ENERGY]: 0 },
        data = { pos, structureType, ticksToRegeneration, store },
        source = new StructureSource(data, id, room);
      addStructure(room, source);
      return source;
    }

    /** INTERNAL */
    update() {
      super.update(...arguments);

      if (--this.ticksToRegeneration <= 0) {
        this.ticksToRegeneration = SOURCE_REGEN_TIME;
        this.store.setUsed(RESOURCE_ENERGY, SOURCE_CAPACITY);
      }
    }

    /** INTERNAL */
    recover() {
      const recover = super.recover();
      recover.store = this.store.recover();
      recover.ticksToRegeneration = this.ticksToRegeneration;
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete StructureSource.prototype.new;
      delete StructureSource.prototype.update;
      delete StructureSource.prototype.recover;
      delete StructureSource.prototype.reduce;
    }
  }

  /** OwnedStructure class defination inherited from Structure */
  class OwnedStructure extends Structure {
    constructor(data) {
      super(...arguments);

      this.owner = data.owner;
      this.my = this.owner === player.name || player.god;
    }

    /**
     * A shorthand to Memory.structures[structure.id].
     * You can use it for quick access the **Structure**’s specific memory data object.
     *
     * @returns {Memory} Memory.structures[this.id]
     *
     * @example
     * spawn.memory.queue = [];
     *
     */
    get memory() {
      const structures = (context.Memory.structures =
        context.Memory.structures || {});
      return (structures[this.id] = structures[this.id] || {});
    }

    /** INTERNAL */
    recover() {
      const recover = super.recover();
      recover.owner = this.owner;
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete OwnedStructure.prototype.reduce;
      delete OwnedStructure.prototype.recover;
    }
  }

  /** StructureSpawn class defination inherited from OwnedStructure */
  class StructureSpawn extends OwnedStructure {
    constructor(data) {
      super(...arguments);

      this.name = data.name;
      this.spawning = data.spawning;
      this.store = new Store(
        data.store,
        [RESOURCE_ENERGY],
        SPAWN_ENERGY_CAPACITY
      );
    }

    /** INTERNAL */
    static new(room, pos, name, owner) {
      if (_.isUndefined(pos)) return null;
      const under = room.at(...pos);
      assert(under.length === 1, `Invalid pos with ${under}`);
      assert(_.head(under) !== TERRAIN_WALL, `Invalid pos with ${under}`);
      const id = engine.RNG.randhex(),
        structureType = STRUCTURE_SPAWN,
        hitsMax = SPAWN_HITS,
        hits = hitsMax,
        spawning = null,
        store = { [RESOURCE_ENERGY]: SPAWN_ENERGY_CAPACITY },
        // prettier-ignore
        data = { pos, hits, hitsMax, structureType, name, owner, spawning, store },
        spawn = new StructureSpawn(data, id, room);
      addStructure(room, spawn);
      return spawn;
    }

    /** INTERNAL */
    update() {
      super.update(...arguments);

      this.store.addUsed(RESOURCE_ENERGY, SPAWN_ENERGY_GENERATION_RATE);
      if (this.store.getUsed(RESOURCE_ENERGY) >= SPAWN_ENERGY_CAPACITY)
        this.store.setUsed(RESOURCE_ENERGY, SPAWN_ENERGY_CAPACITY);
    }

    /**
     * Start the creep spawning process.
     * The required energy amount can be withdrawn from all spawns and extensions in the room.
     *
     * @param {[string]} body An array describing the new creep’s body. Should contain 1 to 50 elements with one of these constants:\
     * WORK, MOVE, CARRY, ATTACK, RANGED_ATTACK, HEAL, TOUGH, CLAIM
     *
     * @param {string} name The name of a new creep.
     * The name length limit is 100 characters.
     * It must be a unique creep name, i.e. the Game.creeps object should not contain another creep with the same name (hash key).
     *
     * @returns {string} OK or ERR codes.
     *
     * @example
     * Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE], 'Worker1');
     *
     */
    spawnCreep(body, name, opts = {}) {
      if (!this.my) return ERR_NOT_OWNER;
      if (!_.isArray(body)) return ERR_INVALID_ARGS;
      if (!_.every(body, (bodypart) => _.includes(CREEP_BODYPARTS, bodypart)))
        return ERR_INVALID_ARGS;
      if (body.length > MAX_CREEP_SIZE) return ERR_INVALID_ARGS;
      if (!_.isString(name)) return ERR_INVALID_ARGS;
      if (!_.isUndefined(context.Game.creeps[name])) return ERR_NAME_EXISTS;
      if (!_.isObject(opts)) return ERR_INVALID_ARGS;
      if (player.god && _.isString(this.spawning)) return ERR_NOT_AVAILABLE;
      if (!player.god && this.spawning instanceof Creep)
        return ERR_NOT_AVAILABLE;
      let energyRequired = _.sum(
        _.map(body, (bodypart) => CREEP_BODYPART_COST[bodypart])
      );
      if (energyRequired > this.room.energyAvailable)
        return ERR_NOT_ENOUGH_RESOURCES;
      const directions = opts.directions || utils.dirs;
      if (_.isEmpty(directions)) return ERR_NO_PATH;
      if (player.god) {
        const drain = (object) => {
          if (energyRequired > 0 && object instanceof StructureSpawn) {
            if (object.store.getUsed(RESOURCE_ENERGY) >= energyRequired)
              object.store.addUsed(RESOURCE_ENERGY, -energyRequired);
            else {
              energyRequired -= object.store.getUsed(RESOURCE_ENERGY);
            }
          }
        };
        drain(this); // Always drain energy from spawn forst
        _.forEach(_structures.get(this.room.name), drain);
        context.Creep.new(this.room, this, name, directions, body, this.owner);
        this.spawning = name;
      } else {
        const args = [body, name, opts];
        player.schedule(this, [`spawnCreep`, args], true);
      }
      return OK;
    }

    /** INTERNAL */
    recover() {
      const recover = super.recover();
      recover.name = this.name;
      recover.spawning = this.spawning;
      recover.store = this.store.recover();
      return recover;
    }

    /** INTERNAL */
    static reduce() {
      delete StructureSpawn.prototype.update;
      delete StructureSpawn.prototype.recover;
      delete StructureSpawn.prototype.reduce;
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
}
module.exports.create = create;

function reduce(context, engine, player) {
  context.Game.constructor.reduce();
  context.Memory.constructor.reduce();

  context.Room.reduce();
  context.RoomPosition.reduce();
  context.RoomTerrain.reduce();
  context.RoomObject.reduce();
  context.Creep.reduce();
  context.Structure.reduce();
  context.StructureController.reduce();
  context.StructureSource.reduce();
  context.OwnedStructure.reduce();
  context.StructureSpawn.reduce();

  _.forEach(context.Game.creeps, (creep) => {
    if (creep.spawning) {
      creep.body = _.take(
        creep.body,
        creep.body.length - Math.ceil(creep.remainingTime / CREEP_SPAWN_TIME)
      );
      creep.spawn = context.Game.spawns[creep.spawn];
    }
  });
  _.forEach(
    context.Game.spawns,
    (spawn) =>
      (spawn.spawning = spawn.spawning
        ? context.Game.creeps[spawn.spawning]
        : null)
  );
}
module.exports.reduce = reduce;
