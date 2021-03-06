`use strict`;

const _ = require(`lodash`);
const assert = require(`assert/strict`);
const constants = require(`./constants`);
const fsp = require(`fs/promises`);
const utils = require(`./utils`);
const setup = require(`./setup`);
const Player = require(`./player`);

class Engine {
  constructor() {
    console.log(`Construct engine`);
    this.ready = this.construct();
  }
  async construct() {
    try {
      const opts = { encoding: `utf8`, flag: `a+` },
        recover = JSON.parse(await fsp.readFile(`./local/meta.json`, opts));

      this.interval = recover.interval;
      assert(_.isNumber(this.interval), `Invalid interval ${this.interval}`);

      this.RNG = new utils.PRNG(...recover.RNG);

      this.players = _.mapValues(
        recover.players,
        (data, name) => new Player(this, data, name)
      );
      assert(_.isObject(this.players), `Invalid players ${this.players}`);
      await Promise.all(_.map(this.players, `ready`));

      this.Game = recover.Game;
      assert(_.isObject(this.Game), `Invalid Game ${this.Game}`);

      this.system = { visible: () => true, god: true };
      setup.create(this, this, this.system);

      _.forEach(
        this.Game.spawns,
        (spawn) => (this.players[spawn.owner].alive = true)
      );

      console.log(`    Engine constructed`);
    } catch (err) {
      console.log(err);
      await this.reset();
    }
  }
  schedule(player, object, args, own) {
    object = this.Game.getObjectById(object.id);
    if (_.isNull(object)) return ERR_NOT_OWNER;
    if (own && player.name != object.owner) return ERR_NOT_OWNER;
    this.scheduleMap.set(object.id, args);
  }
  async start() {
    await this.ready;

    this.scheduleMap = new Map();
    const signal = new Promise((res) =>
      setTimeout(
        () => res(console.log(`Start tick ${this.Game.time}`)),
        this.interval - (new Date() % (this.interval - 1))
      )
    );
    const process = _.map(this.players, (player) => player.start(signal));
    this.process = Promise.all(_.concat(signal, process));

    await this.process;
    console.log(`    End tick ${this.Game.time}\n`);

    this.Game.time++;
    _.forEach(this.Game.rooms, (room) => room.update());
    _.forEach(this.Game.creeps, (creep) => creep.update());
    _.forEach(this.Game.structures, (structure) => structure.update());
    await fsp.writeFile(`./local/meta.json`, JSON.stringify(this.recover()));

    this.process.then((halt) => (halt === true ? null : this.start()));
  }
  async halt() {
    console.log(`Halt engine`);
    if (this.process instanceof Promise) {
      this.process = this.process.then(() => true);
      await this.process;
    }
    console.log(`    Engine halted`);
  }
  async reset(seed = new Date()) {
    console.log(`Reset engine with seed ${seed}`);

    await this.close().catch(() => false);

    await fsp.rm(`./local`, { recursive: true }).catch(() => false);
    await fsp.mkdir(`./local/players`, { recursive: true });
    await fsp.writeFile(`./local/meta.json`, ``);
    await fsp.writeFile(`./local/terrain.json`, ``);

    this.interval = 1000;
    this.RNG = utils.PRNG.from(seed);
    this.players = {};
    this.Game = { time: 0, rooms: {} };

    this.system = { visible: () => true, god: true };
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

    console.log(`    Engine reset`);
    // can't start engine here
  }
  async close() {
    console.log(`Close engine`);
    await this.halt();
    await fsp.writeFile(`./local/meta.json`, JSON.stringify(this.recover()));
    await Promise.all(_.map(this.players, (player) => player.close()));
    console.log(`    Engine closed`);
  }
  async addPlayer(playerName, pass) {
    await this.halt();
    assert(_.isUndefined(this.players[playerName]), `Player name exitst!`);
    const dir = `./local/players/${playerName}`;
    await fsp.mkdir(dir);
    await fsp.mkdir(`${dir}/script`);
    await fsp.writeFile(
      `${dir}/script/main.js`,
      `console.log('It is ', Game.time);

_.forEach(Game.spawns, (spawn) => {
  if (_.keys(Game.creeps).length <= 10) {
    let ret;
    ret = spawn.spawnCreep([WORK, CARRY, MOVE], Math.random().toString());
    console.log(spawn.name, spawn.store.getUsed(RESOURCE_ENERGY), ret);
  } else console.log('Over populated creeps!');
});
_.forEach(Game.creeps, (creep) => {
  console.log(
    creep.name,
    creep.pos,
    creep.spawning,
    creep.store ? creep.store.getUsed(RESOURCE_ENERGY) : null
  );

  if (creep.spawning) return;

  creep.memory.task = creep.memory.task || "harvest";
  if (
    creep.memory.task === "harvest" &&
    creep.store.getFree(RESOURCE_ENERGY) === 0
  )
    creep.memory.task = "upgrade";

  if (
    creep.memory.task === "upgrade" &&
    creep.store.getUsed(RESOURCE_ENERGY) === 0
  )
    creep.memory.task = "harvest";

  const controller = creep.room.controller,
    source = _.head(
      _.filter(creep.room.find(FIND_STRUCTURES), {
        structureType: STRUCTURE_SOURCE,
      })
    );

  const ret1 =
    creep.memory.task === "harvest"
      ? creep.harvest(source)
      : creep.upgradeController(controller);
  console.log(creep.memory.task, ret1);
  if (ret1 === ERR_NOT_IN_RANGE)
    console.log(
      'move to',
      creep.memory.task,
      creep.memory.task === "harvest"
        ? creep.moveTo(source)
        : creep.moveTo(controller)
    );
});`
    );
    await fsp.writeFile(`${dir}/memory.json`, `{}`);
    this.players[playerName] = new Player(this, { pass }, playerName);
    const room = this.RNG.pick(
      _.values(
        _.filter(
          this.Game.rooms,
          (room) => room.controller instanceof this.StructureController
        )
      )
    );
    const poss = _.filter(
      _.flatMap(_.range(5, ROOM_HEIGHT - 5), (y) =>
        _.map(_.range(5, ROOM_WIDTH - 5), (x) => [x, y])
      ),
      ([x, y]) => {
        const look = room.at(x, y);
        return look.length === 1 && _.head(look) !== TERRAIN_WALL;
      }
    );
    const pos = this.RNG.pick(poss);
    console.log(pos);
    this.StructureSpawn.new(room, pos, `Spawn0`, playerName);
    this.start();
  }
  async getMeta(playerName) {
    // no GUI provided. randomly assign spawn
    const player = this.players[playerName];
    assert(player instanceof Player, `Invalid player ${playerName}`);
    const meta = {
      WORLD_WIDTH,
      WORLD_HEIGHT,
      ROOM_WIDTH,
      ROOM_HEIGHT,
      interval: this.interval,
      time: this.time,
      alive: player.alive,
    };
    return meta;
  }
  async setSpawn(playerName, [roomName, x, y], { spawnName }) {
    const player = this.players[playerName];
    assert(player instanceof Player, `Invalid player ${playerName}`);
    const room = this.Game.rooms[roomName];
    if (_.isUndefined(room)) return ERR_NOT_FOUND;
    if (x < 0 || x >= ROOM_WIDTH || y < 0 || y > ROOM_HEIGHT)
      return ERR_INVALID_ARGS;
    const looks = room.at(x, y);
    if (looks.length !== 1 || _.head(looks) !== TERRAIN_PLAIN)
      return ERR_INVALID_ARGS;
    this.StructureSpawn.new(room, [x, y], spawnName, playerName);
    return OK;
  }
  async getRoomMeta(roomName) {
    const room = this.Game.rooms[roomName];
    if (_.isUndefined(room)) return ERR_NOT_FOUND;
    const owner = _.filter(_.map(room.structures, `owner`));
    return { owner: [...new Set(owner)] };
  }
  async getRoomMap(roomName) {
    const join = (row) => _.join(row, ``),
      room = this.Game.rooms[roomName];
    if (_.isUndefined(room)) return ERR_NOT_FOUND;
    return _.join(_.map(room.array(), join), `,`);
  }
  async getRoomData(roomName) {
    const room = this.Game.rooms[roomName];
    if (_.isUndefined(room)) return ERR_NOT_FOUND;
    return room.recover();
  }
  async getLog(playerName) {
    const player = this.players[playerName];
    assert(player instanceof Player, `Invalid player ${playerName}`);
    return {
      stdout: (await fsp.readFile(`${player.prefix}/stdout.log`)).toString(),
      stderr: (await fsp.readFile(`${player.prefix}/stderr.log`)).toString(),
    };
  }
  async getScript(playerName) {
    const player = this.players[playerName];
    assert(player instanceof Player, `Invalid player ${playerName}`);
    return player.script;
  }
  async setScript(playerName, script) {
    const player = this.players[playerName];
    assert(player instanceof Player, `Invalid player ${playerName}`);
    return player.setScript(script);
  }
  recover() {
    const recover = {};
    recover.interval = this.interval;
    if (this.RNG instanceof utils.PRNG) recover.RNG = this.RNG.recover();
    recover.players = _.mapValues(this.players, (player) => player.recover());
    if (_.isObject(this.Game)) recover.Game = this.Game.recover();
    return recover;
  }
}
module.exports = Engine;
