`use strict`;

const _ = require(`lodash`);
const assert = require(`assert/strict`);
const constants = require(`./constants`);
const fs = require(`fs`);
const { Console } = require(`console`);
const vm = require(`vm`);
const setup = require(`./setup`);

class Player {
  constructor(engine, recover, name) {
    this.engine = engine;
    this.name = name;
    this.prefix = `./local/players/${this.name}`;

    const prefix = this.prefix;
    this.watch = fs.watch(`${prefix}/script`, { recursive: true }, (_, file) =>
      fs.readFile(`${prefix}/script/${file}`, (err, data) => {
        if (err) console.log1(`Read script ${err}`);
        else this.script = data.toString();
      })
    );
    this.script = fs.readFileSync(`${prefix}/script/main.js`);

    this.memory = fs.readFileSync(`${prefix}/memory.json`, { flag: `a+` });
  }
  runTick(callback) {
    /** create context */
    const stdout = fs.createWriteStream(`${this.prefix}/stdout.log`),
      stderr = fs.createWriteStream(`${this.prefix}/stderr.log`);
    const console = new Console({ stdout, stderr }),
      consoleLog = console.log;
    console.log = function () {
      consoleLog.call(console, new Date().toJSON(), ...arguments);
    };
    const context = { JSON, require, console, _ };
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
      console.error(err);
    }

    /** stringify Memory */
    this.memory = JSON.stringify(context.Memory);
    fs.writeFileSync(`./local/players/${this.name}/memory.json`, this.memory);

    callback();
  }
  setScript(script) {
    try {
      fs.writeFileSync(`./local/players/${this.name}/script/main.js`, script);
      return `ok`;
    } catch (err) {
      return err.toString();
    }
  }
  schedule(object, args, own) {
    return this.engine.schedule(this, object, args, own);
  }
  close() {
    if (this.watch) this.watch.close();
    return true;
  }
  recover() {
    const recover = {};
    recover.rcl = this.rcl;
    return recover;
  }
}
module.exports = Player;
