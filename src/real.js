`use strict`;

const _ = require(`lodash`);
const utils = require(`./utils`);
const constants = require(`./constants`);

class RoomPosition {
  constructor(x, y, roomName) {
    this.x = x;
    this.y = y;
    this.roomName = roomName;
  }
  get roomX() {
    const [__, quadrant, coordinate] = /([WE])(\d+)[NS]\d+/.exec(this.roomName);
    if (quadrant === `W`) return -1 - Number(coordinate);
    if (quadrant === `E`) return Number(coordinate);
  }
  set roomX(value) {
    const [__, rest] = /[WE]\d+([NS]\d+)/.exec(this.roomName);
    this.roomName = (value >= 0 ? `E${value}` : `W${-1 - value}`) + rest;
    return this.roomName;
  }
  get roomY() {
    const [__, quadrant, coordinate] = /[WE]\d+([NS])(\d+)/.exec(this.roomName);
    if (quadrant === `N`) return -1 - Number(coordinate);
    if (quadrant === `S`) return Number(coordinate);
  }
  set roomY(value) {
    const [__, rest] = /([WE]\d+)[NS]\d+/.exec(this.roomName);
    this.roomName = rest + (value >= 0 ? `S${value}` : `N${-1 - value}`);
    return this.roomName;
  }
  copy() {
    return new RoomPosition(this.x, this.y, this.roomName);
  }
  move(dir) {
    const [dx, dy] = utils.dxdy[dir];
    (this.x += dx), (this.y += dy);
    return this;
  }
  clamp() {
    if (this.x <= 0) this.roomX--, (this.x = ROOM_WIDTH - 1);
    else if (this.x >= ROOM_WIDTH - 1) this.roomX++, (this.x = 0);
    if (this.y <= 0) this.roomY--, (this.y = ROOM_HEIGHT - 1);
    else if (this.y >= ROOM_HEIGHT - 1) this.roomY++, (this.y = 0);
    return this;
  }
  getRangeTo(pos) {
    const [tX, tY] = utils.parse(this.roomName),
      [pX, pY] = utils.parse(pos.roomName);
    return Math.max(
      Math.abs(tX * ROOM_WIDTH + this.x - (pX * ROOM_WIDTH + pos.x)),
      Math.abs(tY * ROOM_HEIGHT + this.y - (pY * ROOM_HEIGHT + pos.y))
    );
  }
  visible(player) {
    return true;
  }
  get recover() {
    const recover = [this.x, this.y, this.roomName];
    return recover;
  }
}
module.exports.RoomPosition = RoomPosition;

class Store {
  constructor(data, limit, capacity) {
    this.data = data;
    this.limit = limit;
    this.capacity = capacity;
  }
  getUsed(resourceType) {
    if (resourceType) return this.data[resourceType] || 0;
    return _.sum(_.values(this.data));
  }
  setUsed(resourceType, amount) {
    this.data[resourceType] = amount;
  }
  addUsed(resourceType, amount) {
    this.setUsed(resourceType, this.getUsed(resourceType) + amount);
  }
  getCapacity(resourceType) {
    if (resourceType === undefined || _.includes(this.limit, resourceType))
      return this.capacity;
    return 0;
  }
  setCapacity(amount) {
    this.capacity = amount;
  }
  addCapacity(amount) {
    this.setCapacity(this.getCapacity(), amount);
  }
  getFree(resourceType) {
    return this.getCapacity(resourceType) - this.getUsed(resourceType);
  }
  get recover() {
    const recover = this.data;
    return recover;
  }
}
module.exports.Store = Store;

class Room {
  static Terrain = class {
    static compress(data, sep = `,`) {
      return _.join(
        _.map(data, (row) => _.join(_.map(row, utils.symbolOf), ``)),
        sep
      );
    }
    static decompress(data, sep = `,`) {
      return _.map(_.split(data, sep), (row) =>
        _.map(_.split(row, ``), utils.meaningOf)
      );
    }
    constructor(data) {
      this.data = Room.Terrain.decompress(data);
    }
    look(x, y) {
      if (x instanceof RoomPosition) (y = x.y), (x = x.x);
      return (this.data[y] || [])[x];
    }
    count(x, y) {
      if (x instanceof RoomPosition) (y = x.y), (x = x.x);
      return _.countBy(
        _.map(utils.dxdy),
        ([dx, dy]) => this.look(x + dx, y + dy) === TERRAIN_PLAIN
      )[true];
    }
    get array() {
      return _.map(this.data, (row) =>
        _.map(row, (sym) => utils.symbolOf(sym))
      );
    }
    get recover() {
      const recover = Room.Terrain.compress(this.data);
      return recover;
    }
  };
  constructor(engine, data, name) {
    this.engine = engine;
    this.name = name;
    this.terrain = new Room.Terrain(data.terrain);
    this.creeps = _.mapValues(
      data.creeps,
      (data, name) => new Creep(this, data, name)
    );
    this.structures = _.mapValues(
      data.structures,
      _.partial(Structure.new, this)
    );
  }
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
  get print() {
    const join = (row) => _.join(row, ``);
    return `|${_.join(_.map(this.array, join), `|\n|`)}|`;
  }
  look(pos, y) {
    if (!(pos instanceof RoomPosition))
      pos = new RoomPosition(pos, y, this.name);
    const creeps = _.filter(this.creeps, { pos }),
      structures = _.filter(this.structures, { pos });
    return _.concat(creeps, structures, [this.terrain.look(pos)]);
  }
  get select() {
    const xy = this.engine.RNG.pick(
      _.filter(
        _.concat(
          ..._.map(_.range(ROOM_HEIGHT), (y) =>
            _.map(_.range(ROOM_WIDTH), (x) => [x, y])
          )
        ),
        ([x, y]) =>
          _.isEqual(this.look(x, y), [TERRAIN_WALL]) && this.terrain.count(x, y)
      )
    );
    if (xy) return new RoomPosition(...xy, this.name);
  }
  update() {
    _.forEach(this.creeps, (creep) => creep.update());
    _.forEach(this.structures, (structure) => structure.update());
  }
  visible(player) {
    return true;
  }
  get recover() {
    const recover = {};
    recover.terrain = this.terrain.recover;
    recover.creeps = _.mapValues(this.creeps, `recover`);
    recover.structures = _.mapValues(this.structures, `recover`);
    return recover;
  }
}
module.exports.Room = Room;

class RoomObject {
  constructor(room, data) {
    this.engine = room.engine;

    this.id = data.id;
    this.room = room;
    this.pos = new RoomPosition(data.pos[0], data.pos[1], this.room.name);
    this.hits = data.hits;
    this.hitsMax = data.hitsMax;
  }
  update() {
    if (this[this.action] instanceof Function)
      this[this.action](...this.args), delete this.action;
  }
  move(dir) {
    if (!_.includes(utils.dirs, dir)) return ERR_INVALID_ARGS;
    const pos = this.pos.copy().move(dir);
    if (!_.isEqual(this.room.look(pos), [TERRAIN_PLAIN])) return ERR_NO_PATH;
    return pos.clamp();
  }
  moveToPos(pos) {
    delete this.room.structures[this.id], (this.pos = pos);
    this.room = this.engine.rooms[this.pos.roomName];
    this.room.structures[this.id] = this;
  }
  get recover() {
    const recover = {};
    recover.pos = this.pos.recover;
    recover.hits = this.hits;
    recover.hitsMax = this.hitsMax;
    recover.id = this.id;
    return recover;
  }
}
module.exports.RoomObject = RoomObject;

class Creep extends RoomObject {
  static new(room, data, name) {
    const creep = new Creep(room, data, name);
    room.creeps[name] = creep;
    return creep;
  }
  constructor(_room, data, name) {
    super(...arguments);

    this.name = name;
    this.head = data.head;
    this.body = data.body;
    this.fatigue = data.fatigue;
    this.owner = data.owner;
    this.store = new Store(
      data.store,
      [RESOURCE_ENERGY],
      this.getActiveBodyparts(CARRY) * CARRY_CAPACITY
    );
  }
  getActiveBodyparts(bodypart) {
    const filter = bodypart ? (part) => part === bodypart : (part) => true;
    return _.sumBy(this.body, filter);
  }
  moveToPos(pos) {
    delete this.room.creeps[this.name], (this.pos = pos);
    this.room = this.engine.rooms[this.pos.roomName];
    this.room.creeps[this.name] = this;
  }
  update() {
    super.update();

    this.fatigue -= this.getActiveBodyparts(MOVE) * (MOVE_POWER + 1);
    if (this.fatigue < 0) this.fatigue = 0;
  }
  move(dir) {
    if (this.getActiveBodyparts(MOVE) === 0) return ERR_NO_BODYPART;
    if (this.fatigue > 0) return ERR_TIRED;
    const ret = super.move(dir);
    if (!(ret instanceof RoomPosition)) return ret;
    (this.action = `move_`), (this.args = [dir, ret]);
    return OK;
  }
  move_(head, pos) {
    const weights =
      this.getActiveBodyparts() -
      Math.ceil(this.store.getUsed() / CARRY_CAPACITY);
    this.fatigue += Math.floor(weights * MOVE_COST[TERRAIN_PLAIN]);
    this.head = head;
    this.moveToPos(pos);
  }
  harvest(target) {
    if (this.pos.getRangeTo(target.pos) > HARVEST_RANGE)
      return ERR_NOT_IN_RANGE;
    if (this.getActiveBodyparts(WORK) === 0) return ERR_NO_BODYPART;
    if (this.store.getFree(RESOURCE_ENERGY) === 0) return ERR_FULL;
    if (target.store.getUsed(RESOURCE_ENERGY) === 0)
      return ERR_NOT_ENOUGH_RESOURCES;
    (this.action = `harvest_`), (this.args = [target.id]);
    return OK;
  }
  harvest_(id) {
    const source = this.room.structures[id],
      power = this.getActiveBodyparts(WORK) * HARVEST_SOURCE_POWER,
      free = this.store.getFree(RESOURCE_ENERGY),
      remain = source.store.getUsed(RESOURCE_ENERGY),
      delta = Math.min(power, free, remain);
    this.store.addUsed(RESOURCE_ENERGY, delta);
    source.store.addUsed(RESOURCE_ENERGY, -delta);
  }
  upgradeController(target) {
    if (this.pos.getRangeTo(target.pos) > UPGRADE_CONTROLLER_RANGE)
      return ERR_NOT_IN_RANGE;
    if (this.getActiveBodyparts(WORK) === 0) return ERR_NO_BODYPART;
    if (this.store.getUsed(RESOURCE_ENERGY) === 0)
      return ERR_NOT_ENOUGH_RESOURCES;
    if (target.level === CONTROLLER_LEVEL_MAX) return ERR_FULL;
    (this.action = `upgradeController_`), (this.args = [target.id]);
    return OK;
  }
  upgradeController_(id) {
    const controller = this.room.structures[id],
      power = this.getActiveBodyparts(WORK) * UPGRADE_CONTROLLER_POWER,
      remain = this.store.getUsed(RESOURCE_ENERGY),
      delta = Math.min(power, remain, CONTROLLER_MAX_UPGRADE_PER_TICK);
    controller.progress += delta;
    this.store.addUsed(RESOURCE_ENERGY, -delta);
  }
  visible(player) {
    return true;
  }
  get recover() {
    const recover = super.recover;
    recover.head = this.head;
    recover.body = this.body;
    recover.fatigue = this.fatigue;
    recover.id = this.id;
    recover.store = this.store.recover;
    return recover;
  }
}
module.exports.Creep = Creep;

class Structure extends RoomObject {
  static new(room, data, id) {
    return new module.exports[`Structure${data.structureType}`](room, data, id);
  }
  constructor(room, data, id) {
    super(room, Object.assign(data, { id }));

    this.structureType = data.structureType;
  }
  update() {}
  visible(player) {
    return true;
  }
  get recover() {
    const recover = super.recover;
    recover.structureType = this.structureType;
    return recover;
  }
}
module.exports.Structure = Structure;

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
  constructor(room, data) {
    super(...arguments);

    this.level = data.level;
    this.progress = data.progress;
    this.progressTotal = CONTROLLER_LEVELS[this.level];

    room.controller = this;
  }
  update() {
    super.update();

    if (this.progress >= this.progressTotal) {
      this.progress -= this.progressTotal;
      this.progressTotal = CONTROLLER_LEVELS[++this.level];
    }
  }
  get recover() {
    const recover = super.recover;
    recover.level = this.level;
    recover.progress = this.progress;
    recover.progressTotal = this.progressTotal;
    return recover;
  }
}
module.exports.StructureController = StructureController;

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
  constructor(_room, data) {
    super(...arguments);

    this.ticksToRegeneration = data.ticksToRegeneration;
    this.store = new Store(data.store, [RESOURCE_ENERGY], SOURCE_CAPACITY);
  }
  update() {
    super.update.call(this);

    if (--this.ticksToRegeneration <= 0) {
      this.ticksToRegeneration = SOURCE_REGEN_TIME;
      this.store.setUsed(RESOURCE_ENERGY, SOURCE_CAPACITY);
    }
  }
  get recover() {
    const recover = super.recover;
    recover.store = this.store.recover;
    recover.ticksToRegeneration = this.ticksToRegeneration;
    return recover;
  }
}
module.exports.StructureSource = StructureSource;

class OwnedStructure extends Structure {
  constructor() {
    super(...arguments);
  }
}
module.exports.OwnedStructure = OwnedStructure;

class StructureSpawn extends Structure {
  constructor(_room, data) {
    super(...arguments);
    this.name = data.name;
    this.store = new Store(
      data.store,
      [RESOURCE_ENERGY],
      SPAWN_ENERGY_CAPACITY
    );
  }
  update() {
    super.update.call(this);

    this.store.add(RESOURCE_ENERGY, SPAWN_ENERGY_GENERATION_RATE);
    if (this.getUsed(RESOURCE_ENERGY) >= SPAWN_ENERGY_CAPACITY)
      this.store.set(RESOURCE_ENERGY, SPAWN_ENERGY_CAPACITY);
  }
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
  get recover() {
    const recover = super.recover;
    recover.store = this.store.recover;
    return recover;
  }
}
module.exports.StructureSpawn = StructureSpawn;
