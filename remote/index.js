function draw(object) {
  // do something!
}

function main() {
  const interval = 1000;
  fetch(`http://127.0.0.1:8080/`, {
    method: `POST`,
    body: `{"request": "getRoomData", "roomName": "W0N0"}`,
  })
    .then((response) => response.json())
    .then((json) => draw(json));
  setTimeout(main, interval - (new Date() % interval));
}

main();
