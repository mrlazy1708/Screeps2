`use strict`;

const _ = require(`lodash`);
const http = require(`http`);
const fs = require(`fs`);

const engine = new (require(`./src/engine`))();

http
  .createServer(function (request, response) {
    const { headers, method, url } = request,
      body = [];
    console.log1(`Incoming request from ${headers.host} by ${method}`);
    request.on(`data`, (chunk) => {
      response.writeHead(200, { "content-Type": "text/html" });
      const data = JSON.parse(chunk.toString());
      if (data.request === "getRoomData")
        response.end(JSON.stringify(engine.getRoomData(data.roomName)));
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
        } else {
          response.writeHead(404, { "content-Type": "text/plain" });
          response.end(`YOU SPELLED IT WRONG`);
        }
      }
    });
  })
  .listen(8080);

console.log(`Server running at http://127.0.0.1:8080/`);
console.log1 = console.log;
console.log = () => {};
