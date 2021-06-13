# Screeps2

**Screeps2** is a modified version of [Screeps - MMO strategy sandbox game for programmers](https://screeps.com/). The main purpose of this project is to rewrite the whole game engine, server and client in my own way, fix some awkward gaming logic of the original version, and to reduce energy cumsumption on the game server and GUI client.

The game engine and http server (currently very rough) is written by [YihengDu](https://github.com/mrlazy1708/) and the GUI client is written by [RuichengWang](https://github.com/wrc042).

***Declaration*** This is a nonprofit project. It's only for studying and entertaining purpose and we don't wish to violate the original game's [Term of Service](https://docs.screeps.com/tos.html).



## Server Launch

Prerequisites:

- Node.js LTS

- Lodash

**Console Launch**

```bash
cd Screeps2   	# cd to the project's root dir
node server.js	# launch server
```

The server is expected to running in the background. Go to [localhost](http://127.0.0.1:8080/) via browser to play the game. Public access is currently not supported.

Only console launcher is supported now. GUI server development is scheduled.



## Develop Plan

- [x] Game engine
  - [ ] Demo bot
  - [ ] History playback
  - [ ] Player script modularization
  - [ ] Engine parallelization
- [x] Http server
  - [ ] GUI
    - [ ] Dashboard
  - [ ] Public access
- [x] Web-based client
  - [x] GUI
    - [ ] Dashboard
    - [ ] Custom theme
    - [ ] Mouse interaction
    - [ ] BGM
  - [ ] Energy saving
- [ ] Wiki



## Introduction

**Screeps2** is mostly inherited from the original game without modification. To get a detailed introduction of the original game, please refer to [Screeps docs](https://docs.screeps.com).



### Overview

**Screeps2** is a real-time multiplayer strategy game. It's about code automation and resource management. Players can create persistent objects and occupy territories via real JavaScript code. Saved scripts are evaluated automatically as long as server is running, regardless of whether each player is online or not. The objective of **Screeps2** is not limited to colony expansion and resource accumulation, each players can pay their own emphasis on different aspects of the game world, such as room planing, resource efficiency and even collaboration with other players.



### Game Time

Although **Screeps2** is a real-time game, it has its own clocks. The in-game time is denoted as **tick**. It is reset to $0$ when the server runs for the first time or reset. Game's **tick** increases by $1$ after each game iteration, which means the game engine finished evaluating of all players' script, updating game states and save all current game data to local backup. Therefore **tick** won't update if the server stops running.



### Random

There are several generative actions that requires randomness:

- **room terrain**
- **room object's id**

To obtain both randomness and reproducibility, we use a properly seeded [xorshift64+](https://en.wikipedia.org/wiki/Xorshift#xorshift+) Pseudo-Random Number Generator. The result is irrelevant to real time, determined only by in-game time and generation sequence. So everything is "predictable" once PRNG's seed and players' action are given.



### Game World

The whole game is running on several almost isolated 2D plain, called **shard**s, using Descartesain Coordinate System whose origin $(0, 0)$ is situated at the top-left corner. There are intershard portals connecting adjacent **shard**s. The origin of each **shard** is situated at the its center.



#### Room

Each **shard** is divided into interconnected **room**s. A **room** is a closed rectangular space with discrete cells in fixed size. All physical events occur within a specific **room**. Each **Room** has:

- `name` - unique string representing the position in the **shard**, such as `W35N28`. It can be denoted as regular expression: `/$[WE]\d+[NS]\d+^/`, where:
  - `[WE]` - if the room is located at the western half  `W` or the eastern half `E`.
    - the following number is the offset relative to center axis, starting from $0$.
  - `[NS]` - same above, representing northern `N` or southern `S`.



##### Room Position

Cells in room are represented by **room position**s. Each **room position** consists of three parts:

- `x` - x coordinate of cell, relative to **room**'s origin.
- `y` - y coordinate of cell, relative to **room**'s origin.
- `roomName` - name of the **room**, which the cell is belonged to.



##### Room Terrain

Each **room**'s landscape is consistant and unique, called **room terrain**. **Terrain**s are generated as a whole during the initialization procedure of the game world and stay unchanged afterwards. It consists of three types of surface:

- `Plain` - simple ground, easy to move and build.
- `Swamp` - increases move cost but does not affect object construction.
- `Wall` - blocks all physical entity.

You can obtain detailed cell-wise **room terrain** information as long as you have visiability to its corresponding room.



##### Room Object

**Room object**s are physical entities. Almost enery object in the game is a **room object**. Each **room object**s have:

- `pos` - the position of **room object**. Therefore the **room** which **room object** is in can be always obtained.
- `id` - the consistent identification string. It's generated automatically randomly on the creation of this **room object**. It is unique accross all **room object**s so you can index every **room object** via its **id** as long as it's visible to you.



#### Creep

**Creep**s are your mobile units. It is a **room object** and is created by a **spawn**. Most actions in the game are conducted by a certain **creep**. They can move, collect resources, defense your colony and attack other player's **creep**s to expand your territory. Any **Creep** has a life cycle, after which it will die but leave its resource in place. So you not only need to control existing creeps but set up manufacturing and automatic control of superseding generations of your creeps as well. **Creep**s have:

- `name` - determined by player on the creation of them. It is unique only across *your* creeps, which means **creep**s belonged to different players can have the same `name`.
- `fatigue` - represent **creep**'s ability to move at a certain **tick**. If `fatigue` $> 0$ then **creep** can't move temporarily.
  - Each **bodypart** (except `MOVE` or *empty* `CARRY`) increases `fatigue` when the **creep** moves:
    -  $1$ on **road**.
    - $2$ on **plain**.
    - $10$ on **swamp**.
    - a **creep** can't move into **wall**.
  - A `MOVE` reduces **creep**'s `fatigue` by $2$ per tick until it reaches $0$.
- `body` - a sequence up to $50$ **bodypart**s. There are $7$ avaliable **bodypart** types:
  - `MOVE` - ability to move. The more `MOVE` a **creep** is equipped, the faster (which means more frequently) it can move without over fatigued.
  - `WORK` - ability to harvest energy, construct and repair structures, upgrade controllers.
  - `CARRY` - ability to transfer resources.
  - `ATTACK` – ability of short-range attack.
  - `RANGED_ATTACK` – ability of ranged attack.
  - `HEAL` – ability to heal other **creep**s.
  - `CLAIM` - ability to claim territory control.
  - `TOUGH` – sole purpose of defense.



#### Structure

**Structure**s are your static units. It's a **room object** and is built by **creep** (except the initial **spawn**, which is directly allocated after respawn by player). There are two types of **structure**:

- **public structure** - everyone have access to it. It's denoted directly by **structure**.
- **owned structure** - only its owner (typically its builder) can operate on it.

