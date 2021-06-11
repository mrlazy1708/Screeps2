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
console.log(Game.time, room.name);

// // const controller = room.controller;
// // console.log1(controller.id, controller.pos);

// const controller = room.controller;
// console.log(
//   `controller`,
//   controller.id,
//   controller.level,
//   controller.progress,
//   controller.progressTotal
// );

const creep = Game.creeps.John;
console.log(`creep`, creep.id, creep.pos, creep.store.getUsed(RESOURCE_ENERGY));

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

console.log(creep.moveTo(source));

// const ret1 = creep.upgradeController(controller);
// console.log(ret1);
// if (ret1 === ERR_NOT_IN_RANGE) console.log(creep.moveTo(controller));
// if (ret1 === ERR_NOT_ENOUGH_RESOURCES) {
//   const ret2 = creep.harvest(source);
//   console.log(ret2);
//   if (ret2 === ERR_NOT_IN_RANGE) console.log(creep.moveTo(source));
// }
