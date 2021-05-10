`use strict`;

//-------------------- shared --------------------//

const real = {
    Global: class {
        constructor(data, player) {
            this.Game = new real.Game(data, player);
            this.Memory = new real.Memory();
            this.global = this;
        }
    },
    Game: class {
        constructor(data, player) {
            this.time = data.time;

            const roomObjectKey = Symbol();
            this[roomObjectKey] = _.mapValues(
                data.roomObjects,
                (roomObject, id) =>
                    new real[`RoomObject${roomObject.type}`](roomObject, id)
            );
            this.getObjectById = this.getObjectById.bind(this, roomObjectKey);

            this.rooms = _.mapValues(data.rooms, (room) => new real.Room(room));
        }
        getObjectById(roomObjectKey, id) {
            const roomObject = this[roomObjectKey][id];
            return roomObject || null;
        }
    },
    Memory: class {
        constructor(data) {
            // Object.assign(this, JSON.parse(data));
        }
    },
    Room: class {
        constructor(data, name) {
            this.name = name;
            this.memory = new real.Memory(data.memory);
        }
    },
    RoomObject: class {
        constructor(data, id) {
            Object.setPrototypeOf(this, proto.RoomObject);

            this.id = id;
            this.pos = new real.RoomPosition(...data.pos);
        }
    },
    RoomPosition: class {
        constructor(x, y, roomName) {
            Object.setPrototypeOf(this, proto.RoomPosition);

            this.x = x;
            this.y = y;
            this.roomName = roomName;
        }
    },
};

//-------------------- server constructors --------------------//
// const application = new PIXI.Application({
//     view: document.getElementById(`canvas`),
//     resizeTo: window,
// });
// document.body.appendChild(application.view);
// Object.setPrototypeOf(this, application);

// const x = (idx % (world.size * 2)) - Math.floor(world.size / 2),
//     name_x = x > 0 ? `E${x - 1}` : `W${-x}`,
//     y = Math.floor(idx / (world.size * 2)) - world.size,
//     name_y = y > 0 ? `S${y - 1}` : `N${-y}`;

const server = {
    Server: class {
        constructor(data) {
            this.data = data;

            this.size = data.size;

            this.time = data.time;

            this.players = _.mapValues(
                data.players,
                (playerData, playerName) =>
                    new server.Player(playerData, playerName)
            );

            this.objects = {};

            this.rooms = _.mapValues(
                data.rooms,
                (roomData, roomName) => new server.Room(roomData, roomName)
            );
        }
        runTick() {
            console.log(`server run at ${this.time}`);

            _.forEach(this.players, (player) => player.runTick(this.data));

            this.time++;
        }
    },
    Player: class {
        constructor(data, name) {
            this.code = data.code;

            this.name = name;
        }
        interpretCode() {
            this.execution = Function(
                `const global = this, globalThis = this; ${this.code}`
            );
            this.global = {};
        }
        runCode(global) {
            console.log(`running ${this.name}'s code`);
            if (!_.isFunction(this.execution)) this.interpretCode();
            this.execution.call(Object.assign(this.global, global));
        }
        runTick(data) {
            this.runCode(new real.Global(data, this));
        }
    },
    Room: function (data, name) {
        this.name = name;
        this.objects = _.mapValues(
            this.objects_data,
            (object_data, key) =>
                new globalThis[`Room_Object_${object_data.type}`](
                    this,
                    object_data,
                    key
                )
        );

        // this.view = new view_room_(this, this.world);
    },

    Room_Object: function (room, data, id) {
        Object.assign(this, data);

        this.room = room;
        this.id = id;
        this.position = new Room_Position(this.position_data);

        this.room.game.objects[id] = this;
    },

    Room_Position: function (data) {
        Object.assign(this, data);
    },
};

//-------------------- main --------------------//

window.onload = function () {
    my_server = new server.Server({
        size: 5,
        time: 0,
        players: {
            admin: {
                code: `console.log();`
                // code: `global.haha = global.haha || 0; console.log('haha! ' + global.haha++);`,
            },
        },
        rooms: { W0N0: {} },
    });
    setInterval(my_server.runTick.bind(my_server), 1000);
    // rooms_map = new view_(world);
    // // globalThis.room = get_container(world);

    // const objects = new PIXI.Graphics();
    // objects.beginFill(0xffffffff);
    // objects.drawCircle(30, 30, 30);
    // objects.endFill();
    // rooms_map.addChild(objects);
};
