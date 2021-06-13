`use strict`;

Object.assign(module.exports, {
  /** game map */
  WORLD_WIDTH: 2,
  WORLD_HEIGHT: 2,
  ROOM_WIDTH: 64,
  ROOM_HEIGHT: 64,
});

Object.assign(global, module.exports);
Object.assign(module.exports, {
  /** directions */
  TOP: `Top`,
  TOP_RIGHT: `Top-Right`,
  RIGHT: `Right`,
  BOTTOM_RIGHT: `Bottom-Right`,
  BOTTOM: `Bottom`,
  BOTTOM_LEFT: `Bottom-Left`,
  LEFT: `Left`,
  TOP_LEFT: `Top-Left`,

  /** colors */
  COLOR_RED: 0,
  COLOR_PURPLE: 1,
  COLOR_BLUE: 2,
  COLOR_CYAN: 3,
  COLOR_GREEN: 4,
  COLOR_YELLOW: 5,
  COLOR_ORANGE: 6,
  COLOR_BROWN: 7,
  COLOR_GREY: 8,
  COLOR_WHITE: 9,

  /** terrains */
  TERRAIN_PLAIN: `Plain`,
  TERRAIN_WALL: `Wall`,
  TERRAIN_SWAMP: `Swamp`,
  TERRAIN_LAVA: `Lava`,

  /** creep bodyparts */
  ATTACK: `Attack`,
  CARRY: `Carry`,
  CLAIM: `Claim`,
  HEAL: `Heal`,
  MOVE: `Move`,
  TOUGH: `Tough`,
  WORK: `Work`,

  /** roomObject types */
  CREEP: `Creep`,
  STRUCTURE_CONTAINER: `Container`,
  STRUCTURE_CONTROLLER: `Controller`,
  STRUCTURE_EXTENSION: `Extension`,
  STRUCTURE_EXTRACTOR: `Extractor`,
  STRUCTURE_FACTORY: `Factory`,
  STRUCTURE_INVADER_CORE: `InvadorCore`,
  STRUCTURE_KEEPER_LAIR: `KeeperLair`,
  STRUCTURE_LAB: `Lab`,
  STRUCTURE_LINK: `Link`,
  STRUCTURE_NUKER: `Nuker`,
  STRUCTURE_OBSERVER: `Observer`,
  STRUCTURE_PORTAL: `Portal`,
  STRUCTURE_RAMPART: `Rampart`,
  STRUCTURE_ROAD: `Road`,
  STRUCTURE_SOURCE: `Source`,
  STRUCTURE_MINERAL: `Mineral`,
  STRUCTURE_SPAWN: `Spawn`,
  STRUCTURE_STORAGE: `Storage`,
  STRUCTURE_TERMINAL: `Terminal`,
  STRUCTURE_TOWER: `Tower`,
  STRUCTURE_WALL: `Wall`,

  /** resources */
  RESOURCE_ENERGY: "Energy",
});

/**
 * Properties
 */
Object.assign(global, module.exports);
Object.assign(module.exports, {
  /** game properties */
  MAX_CONSTRUCTION_SITES: 100,
  MAX_CREEP_SIZE: 50,
  GCL_MULTIPLY: 1000000,
  GCL_NOVICE: 3,
  GCL_POW: 2.4,
  WALKABLE_OBJECT_TYPES: [
    STRUCTURE_CONTAINER,
    STRUCTURE_PORTAL,
    STRUCTURE_RAMPART,
    STRUCTURE_ROAD,
  ],

  /** creep properties */
  /** basic */
  CREEP_LIFE_TIME: 1500,
  CREEP_CLAIM_LIFE_TIME: 600,
  CREEP_CORPSE_RATE: 0.2,
  CREEP_PART_MAX_ENERGY: 125,
  CREEP_BODYPARTS: [ATTACK, CARRY, CLAIM, HEAL, MOVE, TOUGH, WORK],
  CREEP_BODYPART_HITS: 100,
  CREEP_BODYPART_COST: {
    [ATTACK]: 80,
    [CARRY]: 50,
    [CLAIM]: 600,
    [HEAL]: 250,
    [MOVE]: 50,
    [TOUGH]: 10,
    [WORK]: 100,
  },
  /** attack */
  ATTACK_POWER: 30,
  RANGED_ATTACK_POWER: 10,
  /** carry */
  CARRY_CAPACITY: 50,
  /** claim */
  CLAIM_POWER: 300,
  /** heal */
  HEAL_POWER: 12,
  RANGED_HEAL_POWER: 4,
  /** tough */
  /** move */
  MOVE_POWER: 2,
  MOVE_COST: {
    [STRUCTURE_ROAD]: 1,
    [TERRAIN_PLAIN]: 2,
    [TERRAIN_SWAMP]: 10,
    [TERRAIN_WALL]: Infinity,
  },
  /** work */
  BUILD_POWER: 5,
  DISMANTLE_COST: 0.005,
  DISMANTLE_POWER: 50,
  HARVEST_RANGE: 1,
  HARVEST_DEPOSIT_POWER: 1,
  HARVEST_MINERAL_POWER: 1,
  HARVEST_SOURCE_POWER: 2,
  REPAIR_COST: 0.01,
  REPAIR_POWER: 100,
  UPGRADE_CONTROLLER_RANGE: 3,
  UPGRADE_CONTROLLER_POWER: 1,

  /** structure properties */
  /** basic */
  CONSTRUCTION_COST: {
    [STRUCTURE_CONTAINER]: 5000,
    [STRUCTURE_CONTROLLER]: NaN,
    [STRUCTURE_EXTENSION]: 3000,
    [STRUCTURE_EXTRACTOR]: 5000,
    [STRUCTURE_FACTORY]: 100000,
    [STRUCTURE_INVADER_CORE]: NaN,
    [STRUCTURE_KEEPER_LAIR]: NaN,
    [STRUCTURE_LAB]: 50000,
    [STRUCTURE_LINK]: 5000,
    [STRUCTURE_NUKER]: 100000,
    [STRUCTURE_OBSERVER]: 8000,
    [STRUCTURE_PORTAL]: NaN,
    [STRUCTURE_RAMPART]: 1,
    [STRUCTURE_ROAD]: 300,
    [STRUCTURE_SOURCE]: NaN,
    [STRUCTURE_SPAWN]: 15000,
    [STRUCTURE_STORAGE]: 30000,
    [STRUCTURE_TERMINAL]: 100000,
    [STRUCTURE_TOWER]: 5000,
    [STRUCTURE_WALL]: 1,
  },
  CONSTRUCTION_COST_ROAD_SWAMP_RATIO: 5,
  CONSTRUCTION_COST_ROAD_WALL_RATIO: 150,
  // prettier-ignore
  CONSTRUCTION_LIMITS: {
    [STRUCTURE_CONTAINER]: [5,    5,    5,    5,    5,    5,    5,    5,    5   ],
    [STRUCTURE_EXTENSION]: [0,    0,    5,    10,   20,   30,   40,   50,   60  ],
    [STRUCTURE_EXTRACTOR]: [0,    0,    0,    0,    0,    0,    1,    1,    1   ],
    [STRUCTURE_FACTORY]  : [0,    0,    0,    0,    0,    0,    0,    1,    1   ],
    [STRUCTURE_LAB]      : [0,    0,    0,    0,    0,    0,    3,    6,    10  ],
    [STRUCTURE_LINK]     : [0,    0,    0,    0,    0,    2,    3,    4,    6   ],
    [STRUCTURE_NUKER]    : [0,    0,    0,    0,    0,    0,    0,    0,    1   ],
    [STRUCTURE_OBSERVER] : [0,    0,    0,    0,    0,    0,    0,    0,    1   ],
    [STRUCTURE_RAMPART]  : [0,    0,    2500, 2500, 2500, 2500, 2500, 2500, 2500],
    [STRUCTURE_ROAD]     : [2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500],
    [STRUCTURE_SPAWN]    : [0,    1,    1,    1,    1,    1,    1,    2,    3   ],
    [STRUCTURE_STORAGE]  : [0,    0,    0,    0,    1,    1,    1,    1,    1   ],
    [STRUCTURE_TERMINAL] : [0,    0,    0,    0,    0,    0,    1,    1,    1   ],
    [STRUCTURE_TOWER]    : [0,    0,    0,    1,    1,    2,    2,    3,    6   ],
    [STRUCTURE_WALL]     : [0,    0,    2500, 2500, 2500, 2500, 2500, 2500, 2500],
  },
  /** container */
  CONTAINER_CAPACITY: 2000,
  CONTAINER_DECAY_AMOUNT: 5000,
  CONTAINER_DECAY_TIME: 100,
  CONTAINER_DECAY_TIME_OWNED: 500,
  /** controller */
  CONTROLLER_ATTACK_BLOCKED_UPGRADE: 1000,
  CONTROLLER_CLAIM_DOWNGRADE: 300,
  // prettier-ignore
  CONTROLLER_DOWNGRADE: [0, 20000, 10000, 20000, 40000, 80000, 120000, 150000, 200000],
  CONTROLLER_DOWNGRADE_RESTORE: 100,
  CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD: 5000,
  // prettier-ignore
  CONTROLLER_LEVELS: [0, 200, 45000, 135000, 405000, 1215000, 3645000, 10935000, NaN],
  CONTROLLER_LEVEL_MAX: 8,
  CONTROLLER_MAX_UPGRADE_PER_TICK: 15,
  CONTROLLER_NUKE_BLOCKED_UPGRADE: 200,
  CONTROLLER_RESERVE: 1,
  CONTROLLER_RESERVE_MAX: 5000,
  CONTROLLER_SAFE_MODE_COOLDOWN: 50000,
  CONTROLLER_SAFE_MODE_COST: 1000,
  CONTROLLER_SAFE_MODE_DURATION: 20000,
  /** extension */
  EXTENSION_ENERGY_CAPACITY: [50, 50, 50, 50, 50, 50, 50, 100, 200],
  /** extractor */
  EXTRACTOR_COOLDOWN: 5,
  /** factory */
  FACTORY_CAPACITY: 50000,
  /** invador core */
  INVADER_CORE_HITS: 100000,
  INVADER_CORE_CREEP_SPAWN_TIME: [0, 0, 6, 3, 2, 1],
  INVADER_CORE_EXPAND_TIME: [NaN, 4000, 3500, 3000, 2500, 2000],
  INVADER_CORE_CONTROLLER_POWER: 2,
  INVADER_CORE_CONTROLLER_DOWNGRADE: 5000,
  /** keeper lair */
  /** lab */
  LAB_BOOST_ENERGY: 20,
  LAB_BOOST_MINERAL: 30,
  LAB_COOLDOWN: 10,
  LAB_ENERGY_CAPACITY: 2000,
  LAB_MINERAL_CAPACITY: 3000,
  LAB_REACTION_AMOUNT: 5,
  LAB_UNBOOST_ENERGY: 0,
  LAB_UNBOOST_MINERAL: 15,
  /** link */
  LINK_CAPACITY: 800,
  LINK_COOLDOWN: 1,
  LINK_LOSS_RATIO: 0.03,
  /** nuker */
  NUKER_COOLDOWN: 100000,
  NUKER_ENERGY_CAPACITY: 300000,
  NUKER_GHODIUM_CAPACITY: 5000,
  NUKE_DAMAGE: { 0: 10000000, 2: 5000000 },
  NUKE_LAND_TIME: 50000,
  NUKE_RANGE: 10,
  /** observer */
  OBSERVER_RANGE: 10,
  /** rampart */
  RAMPART_DECAY_AMOUNT: 300,
  RAMPART_DECAY_TIME: 100,
  // prettier-ignore
  RAMPART_HITS_MAX: [0, 0, 300000, 1000000, 3000000, 10000000, 30000000, 100000000, 300000000],
  /** road */
  ROAD_DECAY_AMOUNT: 100,
  ROAD_DECAY_TIME: 1000,
  ROAD_WEAROUT: 1,
  ROAD_WEAROUT_POWER_CREEP: 100,
  /** source */
  SOURCE_CAPACITY: 3000,
  SOURCE_DECAY: 1000,
  SOURCE_KEEPER_CAPACITY: 4000,
  SOURCE_NEUTRAL_CAPACITY: 1500,
  SOURCE_REGEN_TIME: 300,
  /** spawn */
  SPAWN_ENERGY_CAPACITY: 300,
  SPAWN_ENERGY_GENERATION_RATE: 1,
  SPAWN_ENERGY_START: 300,
  SPAWN_HITS: 5000,
  SPAWN_RENEW_RATIO: 1.2,
  SPAWN_TIME: 3,
  /** storage */
  STORAGE_CAPACITY: 1000000,
  STORAGE_HITS: 10000,
  /** terminal */
  TERMINAL_CAPACITY: 300000,
  TERMINAL_COOLDOWN: 10,
  TERMINAL_MIN_SEND: 100,
  TERMINAL_SEND_COST: 0.1,
  /** tower */
  TOWER_CAPACITY: 1000,
  TOWER_ENERGY_COST: 10,
  TOWER_FALLOFF: 0.75,
  TOWER_FALLOFF_RANGE: 20,
  TOWER_OPTIMAL_RANGE: 5,
  TOWER_POWER_ATTACK: 600,
  TOWER_POWER_HEAL: 400,
  TOWER_POWER_REPAIR: 800,
  /** wall */
  // prettier-ignore
  WALL_HITS_MAX: [0, 0, 300000, 1000000, 3000000, 10000000, 30000000, 100000000, 300000000],

  MINERAL_REGEN_TIME: 50000,
  MINERAL_MIN_AMOUNT: {
    H: 35000,
    O: 35000,
    L: 35000,
    K: 35000,
    Z: 35000,
    U: 35000,
    X: 35000,
  },
  MINERAL_RANDOM_FACTOR: 2,

  MINERAL_DENSITY: {
    1: 15000,
    2: 35000,
    3: 70000,
    4: 100000,
  },
  MINERAL_DENSITY_PROBABILITY: {
    1: 0.1,
    2: 0.5,
    3: 0.9,
    4: 1.0,
  },
  MINERAL_DENSITY_CHANGE: 0.05,

  DENSITY_LOW: 1,
  DENSITY_MODERATE: 2,
  DENSITY_HIGH: 3,
  DENSITY_ULTRA: 4,

  DEPOSIT_EXHAUST_MULTIPLY: 0.001,
  DEPOSIT_EXHAUST_POW: 1.2,
  DEPOSIT_DECAY_TIME: 50000,

  TOMBSTONE_DECAY_PER_PART: 5,
  TOMBSTONE_DECAY_POWER_CREEP: 500,

  RUIN_DECAY: 500,
  RUIN_DECAY_STRUCTURES: {
    powerBank: 10,
  },
});

/** APIs */
Object.assign(global, module.exports);
Object.assign(module.exports, {
  /** returns */
  /** OK */
  OK: `OK`,
  /** not applicable */
  ERR_NOT_OWNER: `Error: Not Owner`,
  ERR_NOT_AVAILABLE: `Error: Not Available`,
  /** invalid argument */
  ERR_NO_BODYPART: `Error: No Bodypart`,
  ERR_INVALID_ARGS: `Error: Invalid Arguments`,
  ERR_INVALID_TARGET: `Error: Invalid Target`,
  /** requirement error */
  ERR_FULL: `Error: Full`,
  ERR_TIRED: `Error: Tired`,
  ERR_NOT_ENOUGH_RESOURCES: `Error: Not Enough Resources`,
  ERR_NOT_ENOUGH_RCL: `Error: Not Enough RCL`,
  ERR_NOT_ENOUGH_GCL: `Error: Not Enough GCL`,
  /** specific errors */
  ERR_NO_PATH: `Error: No Path`,
  ERR_NAME_EXISTS: `Error: Name Exists`,
  ERR_NOT_FOUND: `Error: Not Found`,
  ERR_NOT_IN_RANGE: `Error: Not In Range`,

  /** finds */
  /** exits */
  FIND_EXITS: `Find: Exits`,
  FIND_TOP_EXITS: `Find: Top Exits`,
  FIND_RIGHT_EXITS: `Find: Right Exits`,
  FIND_BOTTOM_EXITS: `Find: Bottom Exits`,
  FIND_LEFT_EXITS: `Find: Left Exits`,
  /** flags */
  FIND_FLAGS: `Find: Flags`,
  /** resources */
  FIND_DROPPED_RESOURCES: `Find: Dropped Resources`,
  /** creeps */
  FIND_CREEPS: `Find: Creeps`,
  FIND_MY_CREEPS: `Find: My Creeps`,
  FIND_HOSTILE_CREEPS: `Find: Hostile Creeps`,
  /** structures */
  FIND_STRUCTURES: `Find: Structures`,
  FIND_MY_STRUCTURES: `Find: My Structures`,
  FIND_HOSTILE_STRUCTURES: `Find: Hostile Strucutres`,
  /** spawns */
  FIND_SPAWNS: `Find: Spawns`,
  FIND_MY_SPAWNS: `Find: My Spawns`,
  FIND_HOSTILE_SPAWNS: `Find: Hostile Spawns`,
  /** sources */
  FIND_SOURCES: `Find: Sources`,
  FIND_ACTIVE_SOURCES: `Find: Active Sources`,
  /** construction sites */
  FIND_CONSTRUCTION_SITES: `Find: Construction Sites`,
  FIND_MY_CONSTRUCTION_SITES: `Find: My Construction Sites`,
  FIND_HOSTILE_CONSTRUCTION_SITES: `Find: Hostile Construction Sites`,
  /** minerals */
  FIND_MINERALS: `Find: Minerals`,
  /** nukes */
  FIND_NUKES: `Find: Nukes`,
  /** tombstones */
  FIND_TOMBSTONES: `Find: Tombstones`,
  /** deposits */
  FIND_DEPOSITS: `Find: Deposits`,
  /** ruins */
  FIND_RUINS: `Find: Ruins`,
});

/** APIs */
Object.assign(global, module.exports);
Object.assign(module.exports, {
  /** find method */

  /** look method */
  LOOK_CREEPS: "creep",
  LOOK_ENERGY: "energy",
  LOOK_RESOURCES: "resource",
  LOOK_SOURCES: "source",
  LOOK_MINERALS: "mineral",
  LOOK_DEPOSITS: "deposit",
  LOOK_STRUCTURES: "structure",
  LOOK_FLAGS: "flag",
  LOOK_CONSTRUCTION_SITES: "constructionSite",
  LOOK_NUKES: "nuke",
  LOOK_TERRAIN: "terrain",
  LOOK_TOMBSTONES: "tombstone",
  LOOK_POWER_CREEPS: "powerCreep",
  LOOK_RUINS: "ruin",

  PORTAL_DECAY: 30000,

  ORDER_SELL: "sell",
  ORDER_BUY: "buy",

  MARKET_FEE: 0.05,

  MARKET_MAX_ORDERS: 300,
  MARKET_ORDER_LIFE_TIME: 1000 * 60 * 60 * 24 * 30,

  FLAGS_LIMIT: 10000,

  SUBSCRIPTION_TOKEN: "token",
  CPU_UNLOCK: "cpuUnlock",
  PIXEL: "pixel",
  ACCESS_KEY: "accessKey",

  PIXEL_CPU_COST: 10000,

  RESOURCE_HYDROGEN: "H",
  RESOURCE_OXYGEN: "O",
  RESOURCE_UTRIUM: "U",
  RESOURCE_LEMERGIUM: "L",
  RESOURCE_KEANIUM: "K",
  RESOURCE_ZYNTHIUM: "Z",
  RESOURCE_CATALYST: "X",
  RESOURCE_GHODIUM: "G",

  RESOURCE_SILICON: "silicon",
  RESOURCE_METAL: "metal",
  RESOURCE_BIOMASS: "biomass",
  RESOURCE_MIST: "mist",

  RESOURCE_HYDROXIDE: "OH",
  RESOURCE_ZYNTHIUM_KEANITE: "ZK",
  RESOURCE_UTRIUM_LEMERGITE: "UL",

  RESOURCE_UTRIUM_HYDRIDE: "UH",
  RESOURCE_UTRIUM_OXIDE: "UO",
  RESOURCE_KEANIUM_HYDRIDE: "KH",
  RESOURCE_KEANIUM_OXIDE: "KO",
  RESOURCE_LEMERGIUM_HYDRIDE: "LH",
  RESOURCE_LEMERGIUM_OXIDE: "LO",
  RESOURCE_ZYNTHIUM_HYDRIDE: "ZH",
  RESOURCE_ZYNTHIUM_OXIDE: "ZO",
  RESOURCE_GHODIUM_HYDRIDE: "GH",
  RESOURCE_GHODIUM_OXIDE: "GO",

  RESOURCE_UTRIUM_ACID: "UH2O",
  RESOURCE_UTRIUM_ALKALIDE: "UHO2",
  RESOURCE_KEANIUM_ACID: "KH2O",
  RESOURCE_KEANIUM_ALKALIDE: "KHO2",
  RESOURCE_LEMERGIUM_ACID: "LH2O",
  RESOURCE_LEMERGIUM_ALKALIDE: "LHO2",
  RESOURCE_ZYNTHIUM_ACID: "ZH2O",
  RESOURCE_ZYNTHIUM_ALKALIDE: "ZHO2",
  RESOURCE_GHODIUM_ACID: "GH2O",
  RESOURCE_GHODIUM_ALKALIDE: "GHO2",

  RESOURCE_CATALYZED_UTRIUM_ACID: "XUH2O",
  RESOURCE_CATALYZED_UTRIUM_ALKALIDE: "XUHO2",
  RESOURCE_CATALYZED_KEANIUM_ACID: "XKH2O",
  RESOURCE_CATALYZED_KEANIUM_ALKALIDE: "XKHO2",
  RESOURCE_CATALYZED_LEMERGIUM_ACID: "XLH2O",
  RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE: "XLHO2",
  RESOURCE_CATALYZED_ZYNTHIUM_ACID: "XZH2O",
  RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE: "XZHO2",
  RESOURCE_CATALYZED_GHODIUM_ACID: "XGH2O",
  RESOURCE_CATALYZED_GHODIUM_ALKALIDE: "XGHO2",

  RESOURCE_OPS: "ops",

  RESOURCE_UTRIUM_BAR: "utrium_bar",
  RESOURCE_LEMERGIUM_BAR: "lemergium_bar",
  RESOURCE_ZYNTHIUM_BAR: "zynthium_bar",
  RESOURCE_KEANIUM_BAR: "keanium_bar",
  RESOURCE_GHODIUM_MELT: "ghodium_melt",
  RESOURCE_OXIDANT: "oxidant",
  RESOURCE_REDUCTANT: "reductant",
  RESOURCE_PURIFIER: "purifier",
  RESOURCE_BATTERY: "battery",

  RESOURCE_COMPOSITE: "composite",
  RESOURCE_CRYSTAL: "crystal",
  RESOURCE_LIQUID: "liquid",

  RESOURCE_WIRE: "wire",
  RESOURCE_SWITCH: "switch",
  RESOURCE_TRANSISTOR: "transistor",
  RESOURCE_MICROCHIP: "microchip",
  RESOURCE_CIRCUIT: "circuit",
  RESOURCE_DEVICE: "device",

  RESOURCE_CELL: "cell",
  RESOURCE_PHLEGM: "phlegm",
  RESOURCE_TISSUE: "tissue",
  RESOURCE_MUSCLE: "muscle",
  RESOURCE_ORGANOID: "organoid",
  RESOURCE_ORGANISM: "organism",

  RESOURCE_ALLOY: "alloy",
  RESOURCE_TUBE: "tube",
  RESOURCE_FIXTURES: "fixtures",
  RESOURCE_FRAME: "frame",
  RESOURCE_HYDRAULICS: "hydraulics",
  RESOURCE_MACHINE: "machine",

  RESOURCE_CONDENSATE: "condensate",
  RESOURCE_CONCENTRATE: "concentrate",
  RESOURCE_EXTRACT: "extract",
  RESOURCE_SPIRIT: "spirit",
  RESOURCE_EMANATION: "emanation",
  RESOURCE_ESSENCE: "essence",

  REACTIONS: {
    H: {
      O: "OH",
      L: "LH",
      K: "KH",
      U: "UH",
      Z: "ZH",
      G: "GH",
    },
    O: {
      H: "OH",
      L: "LO",
      K: "KO",
      U: "UO",
      Z: "ZO",
      G: "GO",
    },
    Z: {
      K: "ZK",
      H: "ZH",
      O: "ZO",
    },
    L: {
      U: "UL",
      H: "LH",
      O: "LO",
    },
    K: {
      Z: "ZK",
      H: "KH",
      O: "KO",
    },
    G: {
      H: "GH",
      O: "GO",
    },
    U: {
      L: "UL",
      H: "UH",
      O: "UO",
    },
    OH: {
      UH: "UH2O",
      UO: "UHO2",
      ZH: "ZH2O",
      ZO: "ZHO2",
      KH: "KH2O",
      KO: "KHO2",
      LH: "LH2O",
      LO: "LHO2",
      GH: "GH2O",
      GO: "GHO2",
    },
    X: {
      UH2O: "XUH2O",
      UHO2: "XUHO2",
      LH2O: "XLH2O",
      LHO2: "XLHO2",
      KH2O: "XKH2O",
      KHO2: "XKHO2",
      ZH2O: "XZH2O",
      ZHO2: "XZHO2",
      GH2O: "XGH2O",
      GHO2: "XGHO2",
    },
    ZK: {
      UL: "G",
    },
    UL: {
      ZK: "G",
    },
    LH: {
      OH: "LH2O",
    },
    ZH: {
      OH: "ZH2O",
    },
    GH: {
      OH: "GH2O",
    },
    KH: {
      OH: "KH2O",
    },
    UH: {
      OH: "UH2O",
    },
    LO: {
      OH: "LHO2",
    },
    ZO: {
      OH: "ZHO2",
    },
    KO: {
      OH: "KHO2",
    },
    UO: {
      OH: "UHO2",
    },
    GO: {
      OH: "GHO2",
    },
    LH2O: {
      X: "XLH2O",
    },
    KH2O: {
      X: "XKH2O",
    },
    ZH2O: {
      X: "XZH2O",
    },
    UH2O: {
      X: "XUH2O",
    },
    GH2O: {
      X: "XGH2O",
    },
    LHO2: {
      X: "XLHO2",
    },
    UHO2: {
      X: "XUHO2",
    },
    KHO2: {
      X: "XKHO2",
    },
    ZHO2: {
      X: "XZHO2",
    },
    GHO2: {
      X: "XGHO2",
    },
  },

  BOOSTS: {
    work: {
      UO: {
        harvest: 3,
      },
      UHO2: {
        harvest: 5,
      },
      XUHO2: {
        harvest: 7,
      },
      LH: {
        build: 1.5,
        repair: 1.5,
      },
      LH2O: {
        build: 1.8,
        repair: 1.8,
      },
      XLH2O: {
        build: 2,
        repair: 2,
      },
      ZH: {
        dismantle: 2,
      },
      ZH2O: {
        dismantle: 3,
      },
      XZH2O: {
        dismantle: 4,
      },
      GH: {
        upgradeController: 1.5,
      },
      GH2O: {
        upgradeController: 1.8,
      },
      XGH2O: {
        upgradeController: 2,
      },
    },
    attack: {
      UH: {
        attack: 2,
      },
      UH2O: {
        attack: 3,
      },
      XUH2O: {
        attack: 4,
      },
    },
    ranged_attack: {
      KO: {
        rangedAttack: 2,
        rangedMassAttack: 2,
      },
      KHO2: {
        rangedAttack: 3,
        rangedMassAttack: 3,
      },
      XKHO2: {
        rangedAttack: 4,
        rangedMassAttack: 4,
      },
    },
    heal: {
      LO: {
        heal: 2,
        rangedHeal: 2,
      },
      LHO2: {
        heal: 3,
        rangedHeal: 3,
      },
      XLHO2: {
        heal: 4,
        rangedHeal: 4,
      },
    },
    carry: {
      KH: {
        capacity: 2,
      },
      KH2O: {
        capacity: 3,
      },
      XKH2O: {
        capacity: 4,
      },
    },
    move: {
      ZO: {
        fatigue: 2,
      },
      ZHO2: {
        fatigue: 3,
      },
      XZHO2: {
        fatigue: 4,
      },
    },
    tough: {
      GO: {
        damage: 0.7,
      },
      GHO2: {
        damage: 0.5,
      },
      XGHO2: {
        damage: 0.3,
      },
    },
  },

  REACTION_TIME: {
    OH: 20,
    ZK: 5,
    UL: 5,
    G: 5,
    UH: 10,
    UH2O: 5,
    XUH2O: 60,
    UO: 10,
    UHO2: 5,
    XUHO2: 60,
    KH: 10,
    KH2O: 5,
    XKH2O: 60,
    KO: 10,
    KHO2: 5,
    XKHO2: 60,
    LH: 15,
    LH2O: 10,
    XLH2O: 65,
    LO: 10,
    LHO2: 5,
    XLHO2: 60,
    ZH: 20,
    ZH2O: 40,
    XZH2O: 160,
    ZO: 10,
    ZHO2: 5,
    XZHO2: 60,
    GH: 10,
    GH2O: 15,
    XGH2O: 80,
    GO: 10,
    GHO2: 30,
    XGHO2: 150,
  },

  PORTAL_UNSTABLE: 10 * 24 * 3600 * 1000,
  PORTAL_MIN_TIMEOUT: 12 * 24 * 3600 * 1000,
  PORTAL_MAX_TIMEOUT: 22 * 24 * 3600 * 1000,

  POWER_BANK_RESPAWN_TIME: 50000,

  INVADERS_ENERGY_GOAL: 100000,

  SYSTEM_USERNAME: "Screeps",

  // SIGN_NOVICE_AREA and SIGN_RESPAWN_AREA constants are deprecated, please use SIGN_PLANNED_AREA instead
  SIGN_NOVICE_AREA:
    "A new Novice or Respawn Area is being planned somewhere in this sector. Please make sure all important rooms are reserved.",
  SIGN_RESPAWN_AREA:
    "A new Novice or Respawn Area is being planned somewhere in this sector. Please make sure all important rooms are reserved.",
  SIGN_PLANNED_AREA:
    "A new Novice or Respawn Area is being planned somewhere in this sector. Please make sure all important rooms are reserved.",

  EVENT_ATTACK: 1,
  EVENT_OBJECT_DESTROYED: 2,
  EVENT_ATTACK_CONTROLLER: 3,
  EVENT_BUILD: 4,
  EVENT_HARVEST: 5,
  EVENT_HEAL: 6,
  EVENT_REPAIR: 7,
  EVENT_RESERVE_CONTROLLER: 8,
  EVENT_UPGRADE_CONTROLLER: 9,
  EVENT_EXIT: 10,
  EVENT_POWER: 11,
  EVENT_TRANSFER: 12,

  EVENT_ATTACK_TYPE_MELEE: 1,
  EVENT_ATTACK_TYPE_RANGED: 2,
  EVENT_ATTACK_TYPE_RANGED_MASS: 3,
  EVENT_ATTACK_TYPE_DISMANTLE: 4,
  EVENT_ATTACK_TYPE_HIT_BACK: 5,
  EVENT_ATTACK_TYPE_NUKE: 6,

  EVENT_HEAL_TYPE_MELEE: 1,
  EVENT_HEAL_TYPE_RANGED: 2,

  POWER_LEVEL_MULTIPLY: 1000,
  POWER_LEVEL_POW: 2,
  POWER_CREEP_SPAWN_COOLDOWN: 8 * 3600 * 1000,
  POWER_CREEP_DELETE_COOLDOWN: 24 * 3600 * 1000,
  POWER_CREEP_MAX_LEVEL: 25,
  POWER_CREEP_LIFE_TIME: 5000,

  POWER_CLASS: {
    OPERATOR: "operator",
  },

  PWR_GENERATE_OPS: 1,
  PWR_OPERATE_SPAWN: 2,
  PWR_OPERATE_TOWER: 3,
  PWR_OPERATE_STORAGE: 4,
  PWR_OPERATE_LAB: 5,
  PWR_OPERATE_EXTENSION: 6,
  PWR_OPERATE_OBSERVER: 7,
  PWR_OPERATE_TERMINAL: 8,
  PWR_DISRUPT_SPAWN: 9,
  PWR_DISRUPT_TOWER: 10,
  PWR_DISRUPT_SOURCE: 11,
  PWR_SHIELD: 12,
  PWR_REGEN_SOURCE: 13,
  PWR_REGEN_MINERAL: 14,
  PWR_DISRUPT_TERMINAL: 15,
  PWR_OPERATE_POWER: 16,
  PWR_FORTIFY: 17,
  PWR_OPERATE_CONTROLLER: 18,
  PWR_OPERATE_FACTORY: 19,

  EFFECT_INVULNERABILITY: 1001,
  EFFECT_COLLAPSE_TIMER: 1002,

  STRONGHOLD_RAMPART_HITS: {
    0: 0,
    1: 100000,
    2: 200000,
    3: 500000,
    4: 1000000,
    5: 2000000,
  },
  STRONGHOLD_DECAY_TICKS: 75000,
});
Object.assign(global, module.exports);
