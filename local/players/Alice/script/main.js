console.log(Game.time);

_.forEach(Game.spawns, (spawn) => {
  if (_.keys(Game.creeps).length <= 10) {
    let ret;
    ret = spawn.spawnCreep([WORK, CARRY, MOVE], Math.random().toString());
    console.log(spawn.name, spawn.store.getUsed(RESOURCE_ENERGY), ret);
  } else console.log(`Over populated creeps!`);
});
_.forEach(Game.creeps, (creep) => {
  console.log(
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
  console.log(creep.memory.task, ret1);
  if (ret1 === ERR_NOT_IN_RANGE)
    console.log(
      `move to`,
      creep.memory.task,
      creep.memory.task === "harvest"
        ? creep.moveTo(source)
        : creep.moveTo(controller)
    );
});
