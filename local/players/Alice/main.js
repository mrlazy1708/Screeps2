// prettier-ignore
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
console.log1(Game.time);

const room = Game.rooms.W0N0;
console.log1(room.name);

const controller = room.controller;
console.log1(controller.id, controller.pos);

const sources = _.filter(room.find(FIND_STRUCTURES), {
  structureType: STRUCTURE_SOURCE,
});
console.log1(`Sources: `, sources);

const creep = Game.creeps.John;
console.log1(`John: `, creep);
