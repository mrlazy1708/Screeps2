`use strict`;

const _ = require(`lodash`);
const fs = require(`fs`);
const repl = require(`repl`);
const http = require(`http`);
const Engine = require(`./src/engine`);

const engine = new Engine();

http
  .createServer(function (request, response) {
    const { headers, method, url } = request,
      body = [];
    request.on(`data`, (chunk) => {
      response.writeHead(200, { "content-Type": "text/html" });
      const data = JSON.parse(chunk.toString());
      if (data.request === "getRoomData")
        response.end(
          JSON.stringify(engine.Game.rooms[data.roomName].recover())
        );
    });
    request.on(`end`, () => {
      if (body.length === 0) {
        if (url === `/`) {
          response.writeHead(200, { "content-Type": "text/html" });
          fs.createReadStream(`./remote/index.html`).pipe(response);
        } else if (url === `/index.css`) {
          response.writeHead(200, { "content-Type": "text/css" });
          fs.createReadStream("./remote/index.css").pipe(response);
        } else if (url === `/index.js`) {
          response.writeHead(200, { "content-Type": "text/javascript" });
          fs.createReadStream("./remote/index.js").pipe(response);
        } else if (url === `/display.js`) {
          response.writeHead(200, { "content-Type": "text/javascript" });
          fs.createReadStream("./remote/display.js").pipe(response);
        } else if (url === `/monitor.js`) {
          response.writeHead(200, { "content-Type": "text/javascript" });
          fs.createReadStream("./remote/monitor.js").pipe(response);
        } else {
          response.writeHead(404, { "content-Type": "text/plain" });
          // response.end(`YOU SPELLED IT WRONG`);
        }
      }
    });
  })
  .listen(8080);

console.log(`Server running at http://127.0.0.1:8080/`);
console.log1 = console.log;
console.log = () => {};

const local = repl.start();
Object.defineProperties(local.context, {
  console: { value: { log: console.log1 } },
  reset: {
    value: (seed = new Date()) => (engine.requireReset = seed),
  },
  interval: {
    get: () => engine.interval,
    set: (value) => (engine.interval = value),
  },
  time: {
    get: () => engine.Game.time,
    set: (value) => (engine.Game.time = value),
  },
  rooms: { value: engine.Game.rooms },
  creeps: { value: engine.Game.creeps },
  structures: { value: engine.Game.structures },
});
