`use strict`;

import { ShardMap } from "./display.js";

async function shard(shardMap) {
  const { WORLD_WIDTH, WORLD_HEIGHT, interval } = await data(`getMeta`),
    delta = interval - (new Date() % (interval - 1));
  await new Promise((res) => setTimeout(() => res(), delta));

  _.forEach(_.range(-WORLD_HEIGHT / 2, WORLD_HEIGHT / 2), async (y) =>
    _.forEach(_.range(-WORLD_WIDTH / 2, WORLD_WIDTH / 2), async (x) => {
      const roomName =
        `${x >= 0 ? `E${x}` : `W${-1 - x}`}` +
        `${y >= 0 ? `S${y}` : `N${-1 - y}`}`;
      const info = await data(`getRoomMap`, { roomName });
      shardMap.refresh(roomName, info);
    })
  );

  shard(shardMap);
}

async function main() {
  await initMonitor();

  const REFRESH_INTERVAL = 16;
  const shardMap = new ShardMap();
  setInterval(() => shardMap.play(), REFRESH_INTERVAL);

  shard(shardMap);
}
main();
