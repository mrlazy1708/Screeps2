`use strict`;

const _ = require(`lodash`);
const utils = require(`./utils`);
const constants = require(`./constants`);

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
        _.map(utils.dxdyOf),
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
    this.creeps = data.creeps;
    this.structures = data.structures;
  }
  construct(engine = this.engine) {
    this.creeps = _.mapValues(
      this.creeps,
      (data, name) => new Creep(this, data, name)
    );
    this.structures = _.mapValues(
      this.structures,
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
    this.pos = new RoomPosition(...data.pos);
    this.room = room;
    this.hits = data.hits;
    this.hitsMax = data.hitsMax;
    this.id = data.id;
  }
  tryMove(dir) {
    if (!(dir in utils.dxdyOf)) return ERR_INVALID_ARGS;
    const pos = this.pos.copy().move(dir);
    if (!_.isEqual(this.room.look(pos), [TERRAIN_PLAIN])) return ERR_NO_PATH;
    return pos.clamp();
  }
  realMove(pos) {
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
    this.head = data.head;
    this.body = data.body;
    this.fatigue = data.fatigue;
    this.name = name;
    this.id = data.id;
    this.store = new Store(
      data.store,
      [RESOURCE_ENERGY],
      this.getActiveBodyparts(CARRY) * CARRY_CAPACITY
    );
  }
  getActiveBodyparts(bodypart) {
    if (bodypart)
      return _.sumBy(
        this.body,
        (part) => part.type === bodypart && part.hits === CREEP_BODYPART_HITS
      );
    return _.sumBy(this.body, (part) => part.hits === CREEP_BODYPART_HITS);
  }
  realMove(pos) {
    delete this.room.creeps[this.name], (this.pos = pos);
    this.room = this.engine.rooms[this.pos.roomName];
    this.room.creeps[this.name] = this;
  }
  update() {
    if (this.argsMove) this.move(...this.argsMove), delete this.argsMove;

    this.fatigue -= this.getActiveBodyparts(MOVE) * (MOVE_POWER + 1);
    if (this.fatigue < 0) this.fatigue = 0;
  }
  scheduleMove(direction) {
    if (this.fatigue > 0) return ERR_TIRED;
    const ret = this.tryMove(direction);
    if (!(ret instanceof RoomPosition)) return ret;
    this.argsMove = [direction, ret];
    return OK;
  }
  move(head, pos) {
    const weights =
      this.getActiveBodyparts() - Math.ceil(this.store.get() / CARRY_CAPACITY);
    this.fatigue += Math.floor(weights * MOVE_COST[TERRAIN_PLAIN]);
    this.realMove(pos);
    this.head = head;
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
  constructor(room, data, id) {
    super(room, data, id);
    this.room.controller = this;
  }
  get recover() {
    const recover = super.recover;
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
  constructor(room, data, id) {
    super(...arguments);
  }
  get recover() {
    const recover = super.recover;
    return recover;
  }
}
module.exports.StructureSource = StructureSource;

class StructureSpawn extends Structure {
  constructor(room, data, id) {
    super(...arguments);
    this.name = data.name;
    this.store = new Store(
      data.store,
      [RESOURCE_ENERGY],
      SPAWN_ENERGY_CAPACITY
    );
  }
  update() {
    if (this.argsSpawnCreep)
      this.spawnCreep(...this.argsSpawnCreep), delete this.argsSpawnCreep;

    this.store.drain(RESOURCE_ENERGY, SPAWN_ENERGY_GENERATION_RATE);
    if (this.store.get(RESOURCE_ENERGY) >= SPAWN_ENERGY_CAPACITY)
      this.store.set(RESOURCE_ENERGY, SPAWN_ENERGY_CAPACITY);
  }
  scheduleSpawnCreep(body, name, opts) {
    if (name === undefined) return ERR_INVALID_ARGS;
    if (_.countBy(body, (part) => _.includes(CREEP_BODYPARTS, part))[false])
      return ERR_INVALID_ARGS;
    if (this.engine.creeps[name] !== undefined) return ERR_NAME_EXISTS;
    const poss = _.pickBy(
      _.mapValues(utils.dxdyOf, (__, dir) => {
        const pos = this.tryMove(dir);
        if (pos instanceof RoomPosition) return pos;
      })
    );
    if (_.isEmpty(poss)) return ERR_NO_PATH;
    const [dir, pos] = this.engine.RNG.select(poss);
    this.argsSpawnCreep = [dir, pos.recover, body, name, opts];
    return OK;
  }
  spawnCreep(head, pos, body, name, opts) {
    const id = this.engine.RNG.randhex,
      fatigue = 0;
    Creep.new(this.room, { pos, id, head, body, fatigue }, name);
  }
  get recover() {
    const recover = super.recover;
    recover.store = this.store.recover;
    return recover;
  }
}
module.exports.StructureSpawn = StructureSpawn;

class RoomPosition {
  static parseX(roomName) {
    const [_, quadrant, coordinate] = /([WE])(\d+)[NS]\d+/.exec(roomName);
    if (quadrant === `W`) return -1 - Number(coordinate);
    if (quadrant === `E`) return Number(coordinate);
  }
  static setX(roomName, value) {
    const [__, rest] = /[WE]\d+([NS]\d+)/.exec(roomName);
    return (value >= 0 ? `E${value}` : `W${-1 - value}`) + rest;
  }
  static parseY(roomName) {
    const [_, quadrant, coordinate] = /[WE]\d+([NS])(\d+)/.exec(roomName);
    if (quadrant === `N`) return -1 - Number(coordinate);
    if (quadrant === `S`) return Number(coordinate);
  }
  static setY(roomName, value) {
    const [__, rest] = /([WE]\d+)[NS]\d+/.exec(roomName);
    return rest + (value >= 0 ? `S${value}` : `N${-1 - value}`);
  }
  static parse(roomName) {
    return [RoomPosition.parseX(roomName), RoomPosition.parseY(roomName)];
  }
  static clamp(pos) {
    if (pos.x <= 0) pos.roomX--, (pos.x = ROOM_WIDTH - 1);
    else if (pos.x >= ROOM_WIDTH - 1) pos.roomX++, (pos.x = 0);
    if (pos.y <= 0) pos.roomY--, (pos.y = ROOM_HEIGHT - 1);
    else if (pos.y >= ROOM_HEIGHT - 1) pos.roomY++, (pos.y = 0);
    return pos;
  }
  static move(pos, dir) {
    const [dx, dy] = utils.dxdyOf[dir];
    (pos.x += dx), (pos.y += dy);
    return pos;
  }
  static nameOf(x, y) {
    const nameX = x >= 0 ? `E${x}` : `W${-x - 1}`,
      nameY = y >= 0 ? `S${y}` : `N${-y - 1}`;
    return nameX + nameY;
  }
  constructor(x, y, roomName) {
    this.x = x;
    this.y = y;
    this.roomName = roomName;
  }
  get roomX() {
    return RoomPosition.parseX(this.roomName);
  }
  set roomX(value) {
    this.roomName = RoomPosition.setX(value);
    return this;
  }
  get roomY() {
    return RoomPosition.parseY(this.roomName);
  }
  set roomY(value) {
    this.roomName = RoomPosition.setY(value);
    return this;
  }
  copy() {
    return new RoomPosition(this.x, this.y, this.roomName);
  }
  move(dir) {
    return RoomPosition.move(this, dir);
  }
  clamp() {
    return RoomPosition.clamp(this);
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
  constructor(data, range, capacity) {
    this.data = data;
    this.range = range;
    this.capacity = capacity;
  }
  get(resourceType) {
    if (resourceType) return this.data[resourceType] || 0;
    return _.sum(_.values(this.data));
  }
  set(resourceType, amount) {
    this.data[resourceType] = amount;
  }
  drain(resourceType, amount) {
    this.set(resourceType, this.get(resourceType) + amount);
  }
  getCapacity(resourceType) {
    if (resourceType) return resourceType in this.range ? this.capacity : 0;
    return this.capacity;
  }
  setCapacity(amount) {
    this.capacity = amount;
    return this.capacity;
  }
  getFree(resourceType) {
    const free = this.capacity - this.get();
    if (resourceType) return resourceType in this.range ? free : 0;
    return free;
  }
  get recover() {
    const recover = this.data;
    return recover;
  }
}
module.exports.Store = Store;
