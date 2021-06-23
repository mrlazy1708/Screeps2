`use strict`;

const _ = require(`lodash`);
const assert = require(`assert/strict`);
const constants = require(`./constants`);
const fs = require(`fs`);
const utils = require(`./utils`);
const setup = require(`./setup`);
const Player = require(`./player`);

class Engine {
  constructor() {
    console.log(`Engine starting up`);

    const opts = { encoding: `utf8`, flag: `a+` },
      recover = JSON.parse(fs.readFileSync(`./local/meta.json`, opts));

    this.interval = recover.interval;
    this.RNG = new utils.PRNG(...recover.RNG);
    this.players = _.mapValues(
      recover.players,
      (data, name) => new Player(this, data, name)
    );
    this.Game = recover.Game;

    this.system = { visible: () => true, god: true };
    setup.create(this, this, this.system);

    console.log(`  Engine started`);
    this.running = true;
    this.runTick();
  }
  runTick() {
    if (!_.isUndefined(this.requireReset)) {
      this.reset(this.requireReset);
      delete this.requireReset;
    }

    console.log(`Engine start running at ${this.Game.time}`);
    this.startTime = new Date();

    this.scheduleMap = new Map();
    this.ticked = 0;
    _.forEach(this.players, (player) =>
      setImmediate(player.runTick.bind(player, this.endTick.bind(this)))
    );
  }
  schedule(player, object, args, own) {
    object = this.Game.getObjectById(object.id);
    if (_.isNull(object)) return ERR_NOT_OWNER;
    if (own && player.name != object.owner) return ERR_NOT_OWNER;
    this.scheduleMap.set(object.id, args);
  }
  endTick() {
    if (++this.ticked === _.keys(this.players).length) {
      console.log(`  Finishd tick with ${new Date() - this.startTime}ms`);
      this.ticked = 0;
      this.Game.time++;

      _.forEach(this.Game.rooms, (room) => room.update());
      _.forEach(this.Game.creeps, (creep) => creep.update());
      _.forEach(this.Game.structures, (structure) => structure.update());

      fs.writeFileSync(`./local/meta.json`, JSON.stringify(this.recover()));

      // const room = this.Game.rooms.W0N0;
      // console.log1(`print room ${room.name}`);
      // console.log1(room.print());

      const interval = this.interval - (new Date() - this.startTime);
      if (this.running !== true) {
        assert(_.isFunction(this.running), `Invalid callback ${this.running}`);
        console.log1(`Engine closed`);
        return this.running();
      }
      setTimeout(this.runTick.bind(this), interval);
    }
  }
  reset(seed = new Date()) {
    console.log(`Resetting engine using seed ${seed}`);

    this.interval = 1000;
    this.RNG = utils.PRNG.from(seed);
    this.players = {
      Alice: new Player(this, { rcl: 1 }, `Alice`),
    };
    this.Game = { time: 0, rooms: {} };

    setup.create(this, this, this.system);

    const args = [WORLD_WIDTH, WORLD_HEIGHT, ROOM_WIDTH, ROOM_HEIGHT, this.RNG],
      walls = utils.Maze.generate(...args, 0.5, this.RNG.rand() * 0.35),
      swamps = utils.Maze.generate(...args, 1.0, this.RNG.rand() * 0.4);

    this.rooms = _.flatMap(
      _.range(-WORLD_HEIGHT >> 1, WORLD_HEIGHT >> 1),
      (Y) =>
        _.map(_.range(-WORLD_WIDTH >> 1, WORLD_WIDTH >> 1), (X) =>
          this.Room.new(X, Y, walls, swamps)
        )
    );

    const smoo = (x) => Math.floor(Math.tan((x - 0.58) * 2) + 2.5);
    _.forEach(this.rooms, (room) => {
      const fertility = smoo(this.RNG.rand()),
        terrain = room.terrain,
        poss = _.filter(
          _.flatMap(_.range(5, ROOM_HEIGHT - 5), (y) =>
            _.map(_.range(5, ROOM_WIDTH - 5), (x) => [x, y])
          ),
          ([x, y]) =>
            terrain.at(x, y) === TERRAIN_WALL &&
            !_.every(terrain.around(x, y), (look) => look === TERRAIN_WALL)
        );

      const sources = _.map(Array(fertility).fill(room), (room) =>
          this.StructureSource.new(room, this.RNG.pick(poss))
        ),
        actual = fertility - (_.countBy(sources)[null] || 0);

      const controller =
        actual >= 2 && actual <= 3
          ? this.StructureController.new(room, this.RNG.pick(poss))
          : null;
    });
  }
  getRoomData(roomName) {
    const room = this.Game.rooms[roomName];
    if (room instanceof this.Room) return JSON.stringify(room.recover());
  }
  getScript(playerName) {
    const player = this.players[playerName];
    if (player instanceof Player) return player.script;
    return ERR_NOT_FOUND;
  }
  setScript(playerName, script) {
    const player = this.players[playerName];
    if (player instanceof Player) return player.setScript(script);
    return ERR_NOT_FOUND;
  }
  close(callback) {
    _.forEach(this.players, (player) => player.close());
    return (this.running = callback);
  }
  recover() {
    const recover = {};
    recover.interval = this.interval;
    recover.RNG = this.RNG.recover();
    recover.players = _.mapValues(this.players, (player) => player.recover());
    recover.Game = this.Game.recover();
    return recover;
  }
}
module.exports = Engine;
