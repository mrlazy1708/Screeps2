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

_.forEach(Game.spawns, (spawn) => {
  if (_.keys(Game.creeps).length <= 2) {
    const ret = spawn.spawnCreep([WORK, CARRY, MOVE], Math.random().toString());
    console.log1(spawn.name, spawn.store.getUsed(RESOURCE_ENERGY), ret);
  } else console.log1(`Over populated creeps!`);
});
_.forEach(Game.creeps, (creep) => {
  console.log1(
    creep.name,
    creep.pos,
    creep.spawning,
    creep.store ? creep.store.getUsed(RESOURCE_ENERGY) : null
  );

  if (creep.spawning) return;

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

  const controller = creep.room.controller,
    source = _.head(
      _.filter(creep.room.find(FIND_STRUCTURES), {
        structureType: STRUCTURE_SOURCE,
      })
    );

  const ret1 =
    creep.memory.task === "harvest"
      ? creep.harvest(source)
      : creep.upgradeController(controller);
  console.log1(creep.memory.task, ret1);
  if (ret1 === ERR_NOT_IN_RANGE)
    console.log1(
      `move to`,
      creep.memory.task,
      creep.memory.task === "harvest"
        ? creep.moveTo(source)
        : creep.moveTo(controller)
    );
});
