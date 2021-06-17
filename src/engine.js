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
      (data, name) => new Player(data, name)
    );
    this.Game = recover.Game;

    const system = { visible: () => true };
    setup.create(this, this, system);

    console.log(`  Engine started`);
    this.runTick();
  }
  runTick() {
    if (!_.isUndefined(this.requireReset)) {
      this.reset(this.requireReset);
      delete this.requireReset;
    }

    console.log(`Engine start running at ${this.Game.time}`);
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
      this.Game.time++;

      _.forEach(this.Game.rooms, (room) => room.update());
      _.forEach(this.Game.creeps, (creep) => creep.update());
      _.forEach(this.Game.structures, (structure) => structure.update());

      fs.writeFileSync(`./local/meta.json`, JSON.stringify(this.recover()));

      const interval = this.interval - (new Date() - this.startTime);
      setTimeout(this.runTick.bind(this), interval);
    }
  }
  reset(seed = new Date()) {
    console.log(`Resetting engine using seed ${seed}`);

    this.interval = 1000;
    this.RNG = utils.PRNG.from(seed);
    this.players = {
      Alice: new Player({ rcl: 1 }, `Alice`),
    };
    this.Game = { time: 0, rooms: {} };

    const system = { visible: () => true };
    setup.create(this, this, system);

    const args = [WORLD_WIDTH, WORLD_HEIGHT, ROOM_WIDTH, ROOM_HEIGHT, this.RNG],
      walls = utils.Maze.generate(...args, 0.5, this.RNG.rand() * 0.35),
      swamps = utils.Maze.generate(...args, 1.0, this.RNG.rand() * 0.4);

    _.forEach(_.range(-WORLD_HEIGHT >> 1, WORLD_HEIGHT >> 1), (Y) =>
      _.map(_.range(-WORLD_WIDTH >> 1, WORLD_WIDTH >> 1), (X) =>
        this.Room.new(X, Y, walls, swamps)
      )
    );

    _.forEach(this.rooms, (room) => {
      const smoo = (x) => ((x - 0.5) ** 3 + 0.1) * 20,
        fertility = Math.max(0, Math.floor(smoo(RNG.rand)));
      
    });

    // _.forEach(this.rooms, (room) => {
    //   const smoo = (x) => ((x - 0.5) ** 3 + 0.1) * 20,
    //     fertility = Math.max(0, Math.floor(smoo(RNG.rand)));
    //   let nSources =
    //     _.countBy(_.map(Array(fertility).fill(room), real.StructureSource.new))[
    //       null
    //     ] || fertility;
    //   nSources = fertility - nSources;
    //   if (nSources >= 2 && nSources <= 3) real.StructureController.new(room);
    //   /** a claimable room must have exactly 2 or 3 sources, otherwise it will be too barren or too rich */
    // });
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
