// const dirs = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];

// const creep = Game.creeps.John;
// console.log1(creep.pos);
// if (creep.pos.x === 0) creep.memory.dir = RIGHT;
// if (creep.pos.x === ROOM_WIDTH) creep.memory.dir = LEFT;
// if (creep.pos.y === 0) creep.memory.dir = BOTTOM;
// if (creep.pos.y === ROOM_HEIGHT) creep.memory.dir = TOP;
// let dir = creep.memory.dir;
// for (let i = 0; i++ < 10; dir = dirs[Math.floor(Math.random() * 8)]) {
//     const ret = creep.move(dir);
//     console.log1(dir, ret);
//     if (ret === OK) creep.memory.dir = dir;
//     if (ret === OK || ret === ERR_TIRED) break;
// }

// const spawn = Game.spawns[0];
// console.log1(`spawn: `, spawn.pos);

// const ret = spawn.spawnCreep([WORK, CARRY, MOVE], Game.time);

const room = Game.rooms.W0N0;
console.log(Game.time, room.name, room.creeps);

const creep = Game.creeps.John;
console.log(
  `creep`,
  creep.id,
  creep.pos,
  creep.ticksToLive,
  creep.store.getUsed(RESOURCE_ENERGY)
);

const controller = room.controller;
console.log(
  `controller`,
  controller.id,
  controller.level,
  controller.progress,
  controller.progressTotal
);

const source = _.head(
  _.filter(room.find(FIND_STRUCTURES), {
    structureType: STRUCTURE_SOURCE,
  })
);
console.log(
  `source`,
  source.id,
  source.store.getUsed(RESOURCE_ENERGY),
  source.ticksToRegeneration
);

creep.memory.task = creep.memory.task || "harvest";

if (
  creep.memory.task === "harvest" &&
  creep.store.getFree(RESOURCE_ENERGY) === 0
)
  creep.memory.task = "upgrade";

if (
  creep.memory.task === "upgrade" &&
  creep.store.getUsed(RESOURCE_ENERGY) === 0
)
  creep.memory.task = "harvest";

const ret1 =
  creep.memory.task === "harvest"
    ? creep.harvest(source)
    : creep.upgradeController(controller);
console.log(creep.memory.task, ret1);
if (ret1 === ERR_NOT_IN_RANGE)
  console.log(
    `move to`,
    creep.memory.task,
    creep.memory.task === "harvest"
      ? creep.moveTo(source)
      : creep.moveTo(controller)
  );
