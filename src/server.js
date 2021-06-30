`use strict`;

const _ = require(`lodash`);
const assert = require(`assert/strict`);
const fs = require(`fs`);
const fsp = require(`fs/promises`);
const repl = require(`repl`);
const http = require(`http`);
const Engine = require(`./engine`);

class Server {
  constructor(port) {
    this.engine = new Engine();

    this.http = new http.Server().listen(port);
    this.http.on(`request`, this.response.bind(this));

    this.sockets = new Set();
    this.http.on(`connection`, (socket) => this.sockets.add(socket));

    this.repl = repl.start();
    this.repl.on(`exit`, this.close.bind(this));
    Object.defineProperties(this.repl.context, {
      start: { get: () => this.engine.start.bind(this.engine) },
      halt: { get: () => this.engine.halt.bind(this.engine) },
      close: { get: () => this.engine.close.bind(this.engine) },
      reset: { get: () => this.engine.reset.bind(this.engine) },
      interval: {
        get: () => this.engine.interval,
        set: (value) => (this.engine.interval = value),
      },
      time: {
        get: () => this.engine.Game.time,
        set: (value) => (this.engine.Game.time = value),
      },
      rooms: { get: () => this.engine.Game.rooms },
      creeps: { get: () => this.engine.Game.creeps },
      structures: { get: () => this.engine.Game.structures },
    });
  }
  async start() {
    this.engine.start();
  }
  fetchLocal(response) {
    return async function (local, url, code = 200) {
      console.log1(`under ${local}: ${url}`);
      if (await fsp.stat(`${local}${url}.html`).catch(() => false)) {
        response.writeHead(code, { "content-Type": `text/html` });
        fs.createReadStream(`${local}${url}.html`).pipe(response);
        return true;
      }
      if (await fsp.stat(`${local}${url}`).catch(() => false)) {
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
    };
  }
  replyWith(response) {
    return function (data) {
      response.writeHead(200, { "content-Type": "text/plain" });
      response.write(JSON.stringify(data));
      response.end();
    };
  }
  async response(request, response) {
    const { headers, method, url } = request,
      fetchLocal = this.fetchLocal(response),
      replyWith = this.replyWith(response);
    switch (url) {
      /** home page */
      case `/`:
        console.log1(`root`);
        response.writeHead(200, { "content-Type": "text/html" });
        fs.createReadStream(`./remote/index.html`).pipe(response);
        break;

      /** virtual url for identification */
      case `/auth`:
        request.on(`data`, async (chunk) => {
          try {
            const data = JSON.parse(chunk.toString()),
              { name, pass } = data.auth,
              player = this.engine.players[name];
            if (data.request === "login") {
              if (player === undefined) return replyWith(ERR_NOT_FOUND);
              else player.login = pass === this.engine.players[name].pass;
              if (player.login === false) replyWith(ERR_NOT_OWNER);
              if (player.login === true) replyWith(OK);
            }
            if (data.request === "register") {
              if (player !== undefined) replyWith(ERR_NAME_EXISTS);
              else if (!_.isString(pass)) replyWith(ERR_INVALID_ARGS);
              else if (pass.length < 6) replyWith(ERR_INVALID_ARGS);
              else {
                await this.engine.addPlayer(name, pass);
                replyWith(OK);
              }
            }
          } catch (err) {
            console.log1(err);
          }
        });
        break;

      /** virtual url for data fetching and posting */
      case `/data`:
        request.on(`data`, async (chunk) => {
          try {
            const data = JSON.parse(chunk.toString()),
              { name, pass } = data.auth,
              player = this.engine.players[name];
            if (player === undefined) return replyWith(ERR_NOT_AVAILABLE);
            if (player.login === false) replyWith(ERR_NOT_AVAILABLE);
            if (player.login === true) {
              if (this.engine.players[name].pass === pass) {
                if (data.request === "getMeta")
                  replyWith(await this.engine.getMeta(name));
                if (data.request === "setSpawn")
                  replyWith(await this.engine.setSpawn(name, data.pos, data));
                if (data.request === "getRoomData")
                  replyWith(await this.engine.getRoomData(data.roomName));
                if (data.request === "getRoomMap")
                  replyWith(await this.engine.getRoomMap(data.roomName));
                if (data.request === `getLog`)
                  replyWith(await this.engine.getLog(name));
                if (data.request === `getScript`)
                  replyWith(await this.engine.getScript(name));
                if (data.request === `setScript`)
                  replyWith(await this.engine.setScript(name, data.script));
              } else replyWith(ERR_NOT_OWNER);
            }
          } catch (err) {
            console.log1(err);
          }
        });
        break;

      /** default access to local files, or 404 if not found */
      default:
        if (await fetchLocal(`./remote`, url, 200)) break;
        if (await fetchLocal(`./src`, url, 200)) break;
        response.writeHead(404, { "content-Type": "text/html" });
        fs.createReadStream("./remote/404.html").pipe(response);
    }
  }
  async close() {
    await this.engine.close();
    for (const socket of this.sockets)
      socket.destroy(), this.sockets.delete(socket);
    this.http.close(() => console.log1(`Server closed`));
  }
}
module.exports = Server;
