`use strict`;

const _ = require(`lodash`);
const assert = require(`assert/strict`);
const constants = require(`./constants`);
const fs = require(`fs`);
const fsp = require(`fs/promises`);
const { Console } = require(`console`);
const vm = require(`vm`);
const setup = require(`./setup`);

class Player {
  constructor(engine, recover, name) {
    console.log(`Construct player ${name}`);

    this.engine = engine;
    this.name = name;
    this.prefix = `./local/players/${this.name}`; // todo: support dir

    this.pass = recover.pass;
    this.login = false;

    this.ready = this.construct();
  }
  async construct() {
    this.watch = fs.watch(`${this.prefix}/script/main.js`, async (_, file) => {
      const data = await fsp
        .readFile(`${this.prefix}/script/${file}`)
        .catch(() => false);
      this.script = data.toString();
    });
    this.script = await fsp.readFile(`${this.prefix}/script/main.js`);
    this.script = this.script.toString();

    const flag = `a+`;
    this.memory = await fsp.readFile(`${this.prefix}/memory.json`, { flag });

    console.log(`    Player ${this.name} constructed`);
  }
  async start(signal) {
    /** wait for the start state */
    await signal;
    console.log(`Player ${this.name} start running`);

    /** create context */
    const stdout = fs.createWriteStream(`${this.prefix}/stdout.log`),
      stderr = fs.createWriteStream(`${this.prefix}/stderr.log`);
    const console_ = new Console({ stdout, stderr }),
      consoleLog = console_.log;
    console_.log = function () {
      consoleLog.call(console_, new Date().toJSON(), JSON.stringify(arguments));
    };
    const context = { JSON, require, console: console_, _ };
    vm.createContext(context);

    /** setup lexical environment */
    setup.create(context, this.engine, this);
    setup.reduce(context, this.engine, this);

    /** start timer */
    const startTime = new Date();

    /** parse Memory */
    Object.assign(context.Memory, JSON.parse(this.memory));

    /** run code */
    try {
      const script = new vm.Script(this.script);
      script.runInContext(context);
    } catch (err) {
      console_.error(err);
    }

    /** stringify Memory */
    this.memory = JSON.stringify(context.Memory);
    await fsp.writeFile(`${this.prefix}/memory.json`, this.memory);

    /** end running */
    console.log(`    Finish running with ${new Date() - startTime}ms`);
  }
  async close() {
    if (this.watch) this.watch.close();
  }
  async setScript(script) {
    try {
      await fsp.writeFile(`${this.prefix}/script/main.js`, script);
      return OK;
    } catch (err) {
      return err.toString();
    }
  }
  schedule(object, args, own) {
    return this.engine.schedule(this, object, args, own);
  }
  recover() {
    const recover = {};
    recover.pass = this.pass;
    return recover;
  }
}
module.exports = Player;
