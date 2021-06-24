`use strict`;

const _ = require(`lodash`);
const assert = require(`assert/strict`);
const fs = require(`fs`);
const repl = require(`repl`);
const http = require(`http`);
const Engine = require(`./src/engine`);

const engine = new Engine();

const pass = JSON.parse(fs.readFileSync(`./local/pass.json`)),
  stat = _.mapValues(pass, () => false);

const server = http
  .createServer(function (request, response) {
    function responseUnder(local, url, code = 200) {
      console.log1(`under ${local}: ${url}`);
      if (fs.existsSync(`${local}${url}.html`)) {
        response.writeHead(code, { "content-Type": `text/html` });
        fs.createReadStream(`${local}${url}.html`).pipe(response);
        return true;
      }
      if (fs.existsSync(`${local}${url}`)) {
        if (url.endsWith(`.js`) || url.endsWith(`.mjs`)) {
          response.writeHead(code, { "content-Type": `text/javascript` });
          fs.createReadStream(`${local}${url}`).pipe(response);
          return true;
        }
        if (url.endsWith(`.css`)) {
          response.writeHead(code, { "content-Type": `text/css` });
          fs.createReadStream(`${local}${url}`).pipe(response);
          return true;
        }
        if (url.endsWith(`.gif`)) {
          response.writeHead(code, { "content-Type": `image.gif` });
          fs.createReadStream(`${local}${url}`).pipe(response);
          return true;
        }
      }
      console.log1(ERR_NOT_FOUND);
    }
    function responseWith(data, Location = null) {
      response.writeHead(200, { "content-Type": "text/plain", Location });
      response.write(JSON.stringify(data));
      response.end();
    }
    const { headers, method, url } = request;
    switch (url) {
      /** home page */
      case `/`:
        console.log1(`root`);
        response.writeHead(200, { "content-Type": "text/html" });
        fs.createReadStream(`./remote/index.html`).pipe(response);
        break;

      /** virtual url for identification */
      case `/auth`:
        request.on(`data`, (chunk) => {
          try {
            const data = JSON.parse(chunk.toString()),
              auth = data.auth;
            if (data.request === "login") {
              if (pass[auth.name] === undefined) responseWith(ERR_NOT_FOUND);
              else stat[auth.name] = auth.pass === pass[auth.name];
              if (stat[auth.name] === false) responseWith(ERR_NOT_OWNER);
              if (stat[auth.name] === true) responseWith(OK, `/room`);
            }
            if (data.request === "register") {
              if (pass[auth.name] !== undefined) responseWith(ERR_NAME_EXISTS);
              else if (!_.isString(auth.pass) || auth.pass.length < 6)
                responseWith(ERR_INVALID_ARGS);
              else {
                pass[auth.name] = auth.pass;
                fs.writeFileSync(`./local/pass.json`, JSON.stringify(pass));
                responseWith(OK);
              }
            }
          } catch (err) {
            console.log1(err);
          }
        });
        break;

      /** virtual url for data fetching and posting */
      case `/data`:
        request.on(`data`, (chunk) => {
          try {
            const data = JSON.parse(chunk.toString()),
              auth = data.auth;
            if (stat[auth.name] === undefined)
              responseWith(ERR_NOT_FOUND, `/login`);
            if (stat[auth.name] === false)
              responseWith(ERR_NOT_AVAILABLE, `/login`);
            if (stat[auth.name] === true) {
              if (data.request === "getRoomData")
                responseWith(engine.getRoomData(data.roomName));
              if (data.request === "getRoomMap")
                responseWith(engine.getRoomMap(data.roomName));
              if (data.request === `getScript`)
                responseWith(engine.getScript(auth.name));
              if (data.request === `setScript`)
                responseWith(engine.setScript(auth.name, data.script));
            }
          } catch (err) {
            console.log1(err);
          }
        });
        break;

      /** default access to local files, or 404 if not found */
      default:
        if (responseUnder(`./remote`, url, 200)) break;
        if (responseUnder(`./src`, url, 200)) break;
        response.writeHead(404, { "content-Type": "text/html" });
        fs.createReadStream("./remote/404.html").pipe(response);
    }
  })
  .listen(8080);

console.log(`Server running at http://127.0.0.1:8080/`);
console.log1 = console.log;
console.log = () => {};

const sockets = new Set();
server.on(`connection`, (socket) => sockets.add(socket));

const local = repl.start();
local.on(`exit`, () => {
  fs.writeFileSync(`./local/pass.json`, JSON.stringify(pass));
  engine.close(() => {
    for (const socket of sockets) socket.destroy(), sockets.delete(socket);
    server.close(() => console.log1(`Server closed`));
  });
});
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
