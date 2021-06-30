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

    await this.close();

    await fsp.rm(`./local`, { recursive: true });
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
    await fsp.writeFile(`${dir}/script/main.js`, `console.log('Hello World!')`);
    await fsp.writeFile(`${dir}/memory.json`, `{}`);
    this.players[playerName] = new Player(this, { pass }, playerName);
    this.start();
  }
  async getRoomData(roomName) {
    const room = this.Game.rooms[roomName];
    if (room instanceof this.Room) return room.recover();
  }
  async getRoomMap(roomName) {
    const room = this.Game.rooms[roomName];
    const join = (row) => _.join(row, ``);
    if (room instanceof this.Room)
      return _.join(_.map(room.array(), join), `,`);
  }
  async getLog(playerName) {
    const player = this.players[playerName];
    if (player instanceof Player)
      return {
        stdout: (await fsp.readFile(`${player.prefix}/stdout.log`)).toString(),
        stderr: (await fsp.readFile(`${player.prefix}/stderr.log`)).toString(),
      };
    return ERR_NOT_FOUND;
  }
  async getScript(playerName) {
    const player = this.players[playerName];
    if (player instanceof Player) return player.script;
    return ERR_NOT_FOUND;
  }
  async setScript(playerName, script) {
    const player = this.players[playerName];
    if (player instanceof Player) return player.setScript(script);
    return ERR_NOT_FOUND;
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
