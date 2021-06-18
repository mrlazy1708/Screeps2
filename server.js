`use strict`;

const _ = require(`lodash`);
const fs = require(`fs`);
const repl = require(`repl`);
const http = require(`http`);
const Engine = require(`./src/engine`);

const engine = new Engine();

const server = http
  .createServer(function (request, response) {
    const { headers, method, url } = request;
    switch (url) {
      case `/`:
        response.writeHead(200, { "content-Type": "text/html" });
        fs.createReadStream(`./remote/index.html`).pipe(response);
        break;
      case `/cat.gif`:
        response.writeHead(200, { "content-Type": "image/gif" });
        fs.createReadStream(`./remote/cat.gif`).pipe(response);
        break;
      case `/index.css`:
        response.writeHead(200, { "content-Type": "text/css" });
        fs.createReadStream("./remote/index.css").pipe(response);
        break;
      case `/index.js`:
        response.writeHead(200, { "content-Type": "text/javascript" });
        fs.createReadStream("./remote/index.js").pipe(response);
        break;
      case `/display.js`:
        response.writeHead(200, { "content-Type": "text/javascript" });
        fs.createReadStream("./remote/display.js").pipe(response);
        break;
      case `/monitor.js`:
        response.writeHead(200, { "content-Type": "text/javascript" });
        fs.createReadStream("./remote/monitor.js").pipe(response);
        break;
      case `/data`:
        response.writeHead(200, { "content-Type": "text/plain" });
        request.on(`data`, (chunk) => {
          try {
            const data = JSON.parse(chunk.toString());
            if (data.request === "getRoomData")
              response.write(
                JSON.stringify(engine.Game.rooms[data.roomName].recover())
              );
          } catch (err) {}
        });
        request.on(`end`, () => response.end());
        break;
      default:
        response.writeHead(404, { "content-Type": "text/html" });
        fs.createReadStream("./remote/404.html").pipe(response);
    }
  })
  .listen(8080);

console.log(`Server running at http://127.0.0.1:8080/`);
console.log1 = console.log;
console.log = () => {};

const local = repl.start();
local.on(`exit`, () => server.close(() => engine.close()));
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
