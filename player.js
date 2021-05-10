`use strict`;

const _ = require(`lodash`);
const fs = require(`fs`);
const vm = require(`vm`);
const fake = require(`./fake`);
const constants = require(`./constants`);

class Player {
  constructor(root, recover, name) {
    this.root = `${root}/${name}`;
    this.name = name;

    fs.mkdirSync(`${this.root}`, { recursive: true });
    const code = fs.readFileSync(`${this.root}/main.js`, {
      encoding: `utf8`,
      flag: `a+`,
    });
    this.code = code;

    this.memory = fs.readFileSync(`${this.root}/memory.json`, {
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
    fs.writeFileSync(`${this.root}/memory.json`, this.memory);
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
