`use strict`;

const _ = require(`lodash`);
const http = require(`http`);
const fs = require(`fs`);

const engine = new (require(`./src/engine`))();

http
  .createServer(function (request, response) {
    const path = request.url;
    if (path === `/`) {
      response.writeHead(200, { "content-Type": "text/html" });
      fs.createReadStream(`./remote/index.html`).pipe(response);
    } else if (path === `/index.css`) {
      response.writeHead(200, { "content-Type": "text/css" });
      fs.createReadStream("./remote/index.css").pipe(response);
    } else if (path === `/index.js`) {
      response.writeHead(200, { "content-Type": "text/javascript" });
      fs.createReadStream("./remote/index.js").pipe(response);
    } else {
      response.writeHead(404, { "content-Type": "text/plain" });
      response.end(`YOU SPELLED IT WRONG`);
    }
  })
  .listen(8080);

console.log(`Server running at http://127.0.0.1:8080/`);
console.log1 = console.log;
console.log = () => {};
