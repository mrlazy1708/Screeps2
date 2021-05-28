`use strict`;

const _ = require(`lodash`);
const fs = require(`fs`);
const vm = require(`vm`);
const setup = require(`./setup`);

class Player {
  constructor(recover, name) {
    this.name = name;

    this.script = fs.readFileSync(
      `./local/players/${this.name}/script/main.js`,
      {
        encoding: `utf8`,
      }
    );

    this.memory = fs.readFileSync(`./local/players/${this.name}/memory.json`, {
      encoding: `utf8`,
      flag: `a+`,
    });
  }
  runTick(engine, callback) {
    /** create context */
    const context = { JSON, require, console, _ };
    vm.createContext(context);

    /** setup lexical environment */
    setup(engine, this, context);

    /** start timer */
    console.log(`  Running ${this.name}'s code`);
    const startTime = new Date();

    /** parse Memory */
    Object.assign(context.Memory, JSON.parse(this.memory));

    /** run code */
    const script = new vm.Script(this.script);
    script.runInContext(context);

    /** stringify Memory */
    this.memory = JSON.stringify(context.Memory);
    fs.writeFileSync(`./local/players/${this.name}/memory.json`, this.memory);

    console.log(`    ${this.name} ran by ${new Date() - startTime}ms`);

    callback();
  }
  visible() {
    return true;
  }
  get recover() {
    const recover = {};
    recover.rcl = this.rcl;
    return recover;
  }
}
module.exports = Player;
