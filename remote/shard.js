`use strict`;

import { ShardMap } from "./display.js";

initMonitor();

const SHARD_SIZE = 1;

const REFRESH_INTERVAL = 16;
const shardMap = new ShardMap();
setInterval(() => shardMap.play(), REFRESH_INTERVAL);

for (let i = -SHARD_SIZE; i < SHARD_SIZE; i++) {
  for (let j = -SHARD_SIZE; j < SHARD_SIZE; j++) {
    const roomName =
      `${i >= 0 ? `E${i}` : `W${-1 - i}`}` +
      `${j >= 0 ? `S${j}` : `N${-1 - j}`}`;
    data(`getRoomMap`, { roomName }, shardMap.refresh.bind(shardMap, roomName));
  }
}
