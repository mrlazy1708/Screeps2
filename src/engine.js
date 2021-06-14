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

    this.time = recover.time;
    this.interval = recover.interval;

    this.RNG = new utils.PRNG(...recover.RNG);

    this.rooms = recover.rooms;

    const system = { visible: () => true };
    setup.create(this, this, system);
    Object.assign(this, this.Game);

    this.players = _.mapValues(
      recover.players,
      (data, name) => new Player(data, name)
    );

    // this.reset();
    console.log(`  Engine started`);
    this.runTick();
  }
  runTick() {
    console.log(`Engine start running at ${this.time}`);
    this.startTime = new Date();

    this.schedule = new Map();
    this.ticked = 0;
    _.forEach(this.players, (player) =>
      setImmediate(player.runTick.bind(player, this, this.endTick.bind(this)))
    );
  }
  endTick() {
    if (++this.ticked === _.keys(this.players).length) {
      console.log(`  Finishd tick with ${new Date() - this.startTime}ms`);
      this.ticked = 0;
      this.time++;

      _.forEach(this.rooms, (room) => room.update());
      _.forEach(this.creeps, (creep) => creep.update());
      _.forEach(this.structures, (structure) => structure.update());

      fs.writeFileSync(`./local/meta.json`, JSON.stringify(this.recover()));

      const map = this.creeps.John.room.print();
      console.log(`print room ${this.creeps.John.room.name}`);
      console.log(map);

      const interval = this.interval - (new Date() - this.startTime);
      setTimeout(this.runTick.bind(this), interval);
    }
  }
  reset(seed = new Date()) {
    console.log(`Resetting engine using seed ${seed}`);
    this.time = 0;
    this.interval = 1000;
    const RNG = (this.RNG = utils.PRNG.from(seed));
    this.players = {
      Alice: new Player({ rcl: 1 }, `Alice`),
    };
    const paras = [WORLD_WIDTH, WORLD_HEIGHT, ROOM_WIDTH, ROOM_HEIGHT],
      walls = utils.Maze.generate(...paras, RNG, 0.5, RNG.rand * 0.35),
      swamps = utils.Maze.generate(...paras, RNG, 1.0, RNG.rand * 0.4);
    this.rooms = _.mapKeys(
      _.flatMap(_.range(-WORLD_HEIGHT >> 1, WORLD_HEIGHT >> 1), (y) =>
        _.map(_.range(-WORLD_WIDTH >> 1, WORLD_WIDTH >> 1), (x) => {
          function setTerrain(data, value) {
            _.forEach(data, (row, y) =>
              _.forEach(row, (sym, x) => {
                if (!sym) raw[y][x] = value;
              })
            );
          }
          const raw = _.map(Array(ROOM_HEIGHT), () =>
              Array(ROOM_WIDTH).fill(TERRAIN_PLAIN)
            ),
            rX = x + (WORLD_WIDTH >> 1),
            rY = y + (WORLD_HEIGHT >> 1),
            creeps = {},
            structures = {};
          setTerrain(swamps[rY][rX].data, TERRAIN_SWAMP);
          setTerrain(walls[rY][rX].data, TERRAIN_WALL);
          const terrain = real.Room.Terrain.compress(raw),
            name = utils.roomName(x, y);
          real.Room.Terrain.decompress(terrain);
          return new real.Room(this, { terrain, creeps, structures }, name);
        })
      ),
      `name`
    );
    this.creeps = {};
    this.structures = {};
    _.forEach(this.rooms, (room) => {
      room.construct();
      const smoo = (x) => ((x - 0.5) ** 3 + 0.1) * 20,
        fertility = Math.max(0, Math.floor(smoo(RNG.rand))),
        nSources =
          fertility -
            _.countBy(
              _.map(Array(fertility).fill(room), real.StructureSource.new)
            )[null] || fertility;
      /** a claimable room must have exactly 2 or 3 sources, otherwise it will be too barren or too rich */
      if (nSources >= 2 && nSources <= 3) real.StructureController.new(room);
    });
    fs.writeFileSync(`./local/meta.json`, JSON.stringify(this.recover()));
    // this.creeps = {};
    // real.Creep.new(
    //     this.rooms.W0N0,
    //     {
    //         id: `000`,
    //         pos: [10, 10, `W0N0`],
    //         head: TOP,
    //         body: [WORK, CARRY, MOVE],
    //         fatigue: 0,
    //     },
    //     `John`
    // );
  }
  getRoomData(roomName) {
    return this.rooms[roomName].recover();
  }
  recover() {
    const recover = {};
    recover.time = this.time;
    recover.interval = this.interval;
    recover.RNG = this.RNG.recover();
    recover.players = _.mapValues(this.players, (player) => player.recover());
    recover.rooms = _.mapValues(this.rooms, (room) => room.recover());
    return recover;
  }
}
module.exports = Engine;
