function draw(object) {
  console.log(object);
}

function main() {
  const interval = 1000;
  fetch(`${window.location.herf}`, {
    method: `POST`,
    body: `{"request": "data", "player": "Alice"}`,
  })
    .then((response) => response.json())
    .then((json) => draw(json));
  setTimeout(main, interval - (new Date() % interval));
}

main();
