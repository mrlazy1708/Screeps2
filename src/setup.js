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

  /**
   * The main global game object containing all the game play information.
   *
   */
  class Game {
    constructor() {
      this.time = engine.time;

      /** Game.rooms */
      this.rooms = _.mapValues(
        _.pickBy(engine.rooms, player.visible),
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
  }

  /**
   * A global plain object which can contain arbitrary data.
   * You can access it using the **Memory** API.
   *
   * @todo Add UI Memory interface.
   *
   */
  class Memory {}

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

    /** update room stats */
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
        creeps = _.filter(context.Game.creeps, { pos: pos }),
        structures = _.filter(context.Game.structures, { pos: pos });
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

    /** get room terrain and objects in ASCII Array */
    get array() {
      const array = this.terrain.array,
        draw = (object) => {
          const pos = object.pos;
          console.log(pos, utils.symbolOf(object));
          array[pos.y][pos.x] = utils.symbolOf(object);
        };
      _.forEach(_creeps.get(this.name), draw);
      _.forEach(_structures.get(this.name), draw);
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
      assert(x >= 0 && x < ROOM_WIDTH, `Invalid x coordinate!`);
      assert(y >= 0 && y < ROOM_HEIGHT, `Invalid y coordinate!`);
      assert.match(roomName, /[WE]\d+[NS]\d+/, `Invalid room name!`);
      this.x = x;
      this.y = y;
      this.roomName = roomName;
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

    /** get [X, Y] coordinate in roomName */
    get XY() {
      const [__, qx, nx, qy, ny] = /([WE])(\d+)([NS])(\d+)/.exec(this.roomName),
        y = qy === `N` ? -1 - Number(ny) : Number(ny),
        x = qx === `W` ? -1 - Number(nx) : Number(nx);
      return [x, y];
    }

    /** convert to number */
    get [Symbol.toPrimitive]() {
      return (pref) => {
        if (pref === `default` || pref === `string`)
          return `[${this.roomName}: (${this.x}, ${this.y})]`;
        if (pref === `number`) return this.x + this.y * ROOM_WIDTH;
      };
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
    /** clamp RoomPosition over boundaries */
    clamp(minX = 0, minY = 0, maxX = ROOM_WIDTH - 1, maxY = ROOM_HEIGHT - 1) {
      if (this.x <= minX) {
        const X = this.X - 1;
        if (-X * 2 <= WORLD_WIDTH) (this.X = X), (this.x = maxX);
        else assert(this.x === minX, `Move into the wild!`);
      } else if (this.x >= maxX) {
        const X = this.X + 1;
        if (X * 2 < WORLD_WIDTH) (this.X = X), (this.x = minX);
        else assert(this.x === maxX, `Move into the wild!`);
      }
      if (this.y <= minY) {
        const Y = this.Y - 1;
        if (-Y * 2 <= WORLD_HEIGHT) this.Y--, (this.y = maxY);
        else assert(this.y === minY, `Move into the wild!`);
      } else if (this.y >= maxY) {
        const Y = this.Y + 1;
        if (Y * 2 < WORLD_HEIGHT) this.Y++, (this.y = minY);
        else assert(this.y === maxY, `Move into the wild!`);
      }
      return this;
    }
    /** get range to another RoomPosition */
    getRangeTo(pos) {
      assert(!_.isUndefined(pos) && !_.isNull(pos), `Invalid pos ${pos}!`);
      if (!(pos instanceof RoomPosition)) pos = pos.pos;
      assert(pos instanceof RoomPosition, `Invalid pos ${pos}!`);
      const [[tX, tY], [pX, pY]] = [this.XY, pos.XY];
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

  /**
   * An object which provides fast access to room terrain data.
   *
   */
  class RoomTerrain {
    /** Stringify terrain data to compact string. */
    static compress(data, sep = `,`) {
      return _.join(
        _.map(data, (row) => _.join(_.map(row, utils.symbolOf), ``)),
        sep
      );
    }

    /** Parse compressed terrain data. */
    static decompress(data, sep = `,`) {
      return _.map(_.split(data, sep), (row) =>
        _.map(_.split(row, ``), utils.meaningOf)
      );
    }

    constructor(terrain) {
      this.data = terrain.data || RoomTerrain.decompress(terrain);
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
        const terrain = context.Game.rooms[roomName].terrain;
        return _.map(_.flatten(terrain.data), (sym) => this.moveCost[sym]);
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
  }

  /**
   * Any object with a position in a room.
   * Almost all game objects prototypes are derived from RoomObject.
   *
   */
  class RoomObject {
    constructor(data, id, room) {
      this.id = id;
      this.room = room;

      let pos = data.pos;
      if (!(pos instanceof Array)) pos = [pos.x, pos.y];
      this.pos = new RoomPosition(...pos, this.room.name);
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
      if (!engine.schedule.has(this.id)) return;
      const callback = engine.schedule.get(this.id);
      assert(_.isFunction(callback), `Invalid action name!`);
      const ret = callback.call(this, ...arguments);
      this.pos = this.pos.clamp();
      if (this.room.name != this.pos.roomName) {
        if (this instanceof Creep) delete this.room.creeps[this.name];
        if (this instanceof Structure) delete this.room.structures[this.id];
        this.room = context.Game.rooms[this.pos.roomName];
        if (this instanceof Creep) this.room.creeps[this.name] = this;
        if (this instanceof Structure) this.room.structures[this.id] = this;
      }
      return ret;
    }

    /** remove roomObject */
    remove() {}

    /** get recovering data */
    get recover() {
      const recover = {};
      recover.pos = this.pos.recover;
      recover.hits = this.hits;
      recover.hitsMax = this.hitsMax;
      return recover;
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

  /**
   * Creeps are your units.
   * Creeps can move, harvest energy, construct structures, attack another creeps, and perform other actions.
   *
   */
  class Creep extends RoomObject {
    constructor(data, name, room) {
      super(data, data.id, room);
      this.name = name;

      this.head = data.head;
      this.body = data.body;
      this.fatigue = data.fatigue;
      this.ticksToLive = data.ticksToLive;
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
      if (this.fatigue <= 0) this.fatigue = 0;
      this.ticksToLive--;
      if (this.ticksToLive <= 0) this.remove();
    }

    /** remove creep */
    remove() {
      super.remove(...arguments);

      delete this.room.creeps[this.name];
      delete context.Game.creeps[this.name];
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
      if (!this.getActiveBodyparts(MOVE)) return ERR_NO_BODYPART;
      if (!_.includes(utils.dirs, dir)) return ERR_INVALID_ARGS;
      if (this.fatigue > 0) return ERR_TIRED;
      const pos = this.pos.clone().move(dir),
        objects = pos.look();
      if (_.head(objects) === TERRAIN_WALL) return ERR_NO_PATH;
      if (!_.every(_.tail(objects), `walkable`)) return ERR_NO_PATH;
      this.schedule(function () {
        this.head = dir;
        this.pos = pos;
      });
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
      console.log(path);
      if (!this.my) return ERR_NOT_OWNER;
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
        this.schedule(function () {
          this.store.addUsed(RESOURCE_ENERGY, amount);
        });
        target.schedule(function () {
          this.store.addUsed(RESOURCE_ENERGY, -amount);
        });
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
      if (!this.getActiveBodyparts(WORK)) return ERR_NO_BODYPART;
      if (!(target instanceof StructureController)) return ERR_INVALID_ARGS;
      if (this.pos.getRangeTo(target) > UPGRADE_CONTROLLER_RANGE)
        return ERR_NOT_IN_RANGE;
      const amount1 = this.store.getUsed(RESOURCE_ENERGY);
      if (amount1 <= 0) return ERR_NOT_ENOUGH_RESOURCES;
      let amount = this.getActiveBodyparts(WORK) * UPGRADE_CONTROLLER_POWER;
      amount = Math.min(amount, amount1);
      target.schedule(function () {
        this.progress += amount;
      });
      this.schedule(function () {
        this.store.addUsed(RESOURCE_ENERGY, -amount);
      });
      return OK;
    }

    /** get recovering data */
    get recover() {
      const recover = super.recover;
      recover.id = this.id;
      recover.head = this.head;
      recover.body = this.body;
      recover.fatigue = this.fatigue;
      recover.ticksToLive = this.ticksToLive;
      recover.owner = this.owner;
      recover.store = this.store.recover;
      return recover;
    }
  }

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
      this.walkable = _.includes(WALKABLE_OBJECT_TYPES, this.structureType);
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
      if (_.isUndefined(name)) return ERR_INVALID_ARGS;
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
  const Game = context.Game;

  _.forEach(Game.rooms, (room) => {
    delete room.creeps;
    delete room.structures;
  });

  // const RoomPosition = context.RoomPosition;
  // delete RoomPosition.prototype.roomX;
  // delete RoomPosition.prototype.roomY;
  // delete RoomPosition.prototype.clone;
  // delete RoomPosition.prototype.move;
  // delete RoomPosition.prototype.clamp;
  // delete RoomPosition.prototype.recover;

  // const Store = context.Store;
  // delete Store.prototype.setCapacity;
  // delete Store.prototype.addCapacity;
  // delete Store.prototype.setUsed;
  // delete Store.prototype.addUsed;
  // delete Store.prototype.recover;

  // const Room = context.Room;
  // delete Room.prototype.find;
  // delete Room.prototype.recover;
}
module.exports.reduce = reduce;
