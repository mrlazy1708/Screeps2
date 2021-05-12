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

// module.exports.loop = function () {
const room = Game.rooms.W0N0;
console.log(Game.time, room.name);

// const controller = room.controller;
// console.log1(controller.id, controller.pos);

const source = _.filter(room.find(FIND_STRUCTURES), {
  structureType: STRUCTURE_SOURCE,
})[0];

const creep = Game.creeps.John;

console.log(source.pos, creep.pos);

console.log(creep.store.getUsed(RESOURCE_ENERGY));

const ret = creep.harvest(source);
console.log(ret);
if (ret === ERR_NOT_IN_RANGE) console.log(creep.moveTo(source));
// };
