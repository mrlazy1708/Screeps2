# Screeps2

**Screeps2** is a modified version of [Screeps - MMO strategy sandbox game for programmers](https://screeps.com/).

This project is a standalone game server that allows you to launch your own game world on a local computer or dedicated server on the Internet.

The main purpose of **Screeps2** is to rewrite the whole game engine, server and client in my own way, fix some awkward gaming logic of the original game, and to reduce energy cumsumption on the game server and GUI client.

For a detailed introduction to the game, please refer to the [Screeps2 wiki](https://github.com/mrlazy1708/Screeps2/wiki).

A public accessible server is deployed [here](http://47.95.113.244:8080).

<br />

## Installation

Prerequisites:

- [**Node.js**](https://nodejs.org) - local running environment, version 15.0.0 or higher
- [**Lodash**](https://lodash.com) - provide functional utilities for JavaScript

```bash
git clone https://github.com/mrlazy1708/Screeps2.git
```

<br />

## Server Launch

**Console Server**

- **Launch**

```bash
cd Screeps2   	# cd to the project's root dir
node launch.js	# launch server
```

The server is expected to running in the background. Go to [localhost@8080](http://127.0.0.1:8080/) via browser to play the game locally. Others can directly access your server if they have your public IP on the Internet.

- **Close**

Use a `EOF` signal (Ctrl + D or twice Ctrl + C) to exit the node [REPL](https://nodejs.org/api/repl.html) environment locally, and the server will close the engine, then close all http connections and finally exit properly.

**GUI Server**

Only console launcher is supported now. GUI server development is scheduled.

<br />

## Future Plan

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
- [ ] Login system
- [x] Wiki

<br />

## Credits

The game **engine**, http **server** and **wiki** (and this README) is written by [YihengDu](https://github.com/mrlazy1708/).

The web-based **client** (including GUI) is written by [RuichengWang](https://github.com/wrc042).

<br />

## License

This is a nonprofit project. It's intended only for studying and entertaining purpose and we don't wish to violate the original game's [Term of Service](https://docs.screeps.com/tos.html).

If there's anything that we did violates the *tos*, please contact me by making an issue.
