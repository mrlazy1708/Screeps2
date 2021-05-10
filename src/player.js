`use strict`;

const _ = require(`lodash`);
const fs = require(`fs`);
const vm = require(`vm`);
const fake = require(`./fake`);
const constants = require(`./constants`);

class Player {
  constructor(recover, name) {
    this.name = name;

    fs.mkdirSync(`./local/player/${this.name}`, { recursive: true });
    const code = fs.readFileSync(`./local/players/${this.name}/main.js`, {
      encoding: `utf8`,
      flag: `a+`,
    });
    this.code = code;

    this.memory = fs.readFileSync(`./local/players/${this.name}/memory.json`, {
      encoding: `utf8`,
      flag: `a+`,
    });
  }
  runTick(engine, callback) {
    this.Memory = {};
    const context = {
      _: _,
      Game: new fake.GameClass(engine, this),
      Memory: this.Memory,
      Room: fake.Room,
      Creep: fake.Creep,
      require: require,
      console: console,
      JSON: JSON,
    };
    Object.assign(context, constants);
    vm.createContext(context);

    console.log(`  Running ${this.name}'s code`);
    const startTime = new Date();
    try {
      Object.assign(this.Memory, JSON.parse(this.memory || `{}`));
      vm.runInContext(this.code, context);
      this.memory = JSON.stringify(this.Memory);
    } catch (err) {
      console.log1(err);
    }
    fs.writeFileSync(`./local/players/${this.name}/memory.json`, this.memory);
    console.log(`    ${this.name} ran by ${new Date() - startTime}ms`);

    callback();
  }
  get recover() {
    const recover = {};
    recover.rcl = this.rcl;
    return recover;
  }
}
module.exports = Player;
