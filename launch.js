const _ = require(`lodash`);
const assert = require(`assert/strict`);
const Server = require(`./src/server`);

const server = new Server(8080);

console.log1 = console.log;
server.start();
