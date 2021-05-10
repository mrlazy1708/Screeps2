`use strict`;

const _ = require(`lodash`);
require(`./constants`);

// prettier-ignore
const directions = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
module.exports.directions = directions;

// prettier-ignore
const dxdyOf = {[TOP]: [0, -1], [TOP_RIGHT]: [1, -1], [RIGHT]: [1, 0], [BOTTOM_RIGHT]: [1, 1], [BOTTOM]: [0, 1], [BOTTOM_LEFT]: [-1, 1], [LEFT]: [-1, 0], [TOP_LEFT]: [-1, -1]};
module.exports.dxdyOf = dxdyOf;

// prettier-ignore
const ASCIIs = {[TERRAIN_PLAIN]: ` `, [TERRAIN_SWAMP]: `~`, [TERRAIN_LAVA]: `!`, [TERRAIN_WALL]: `x`, 
    [TOP]: `↑`, [TOP_RIGHT]: `↗`, [RIGHT]: `→`, [BOTTOM_RIGHT]: `↘`, [BOTTOM]: `↓`, [BOTTOM_LEFT]: `↙`, [LEFT]: `←`, [TOP_LEFT]: `↖`, 
    [STRUCTURE_CONTROLLER]: `⌘`,[STRUCTURE_SOURCE]: `☢︎`,[STRUCTURE_SPAWN]: `⚙︎`};
module.exports.symbolOf = (object) =>
  ASCIIs[object] || ASCIIs[object.head] || ASCIIs[object.structureType];
const invertedASCIIs = _.invert(ASCIIs);
module.exports.meaningOf = (symbol) => invertedASCIIs[symbol];

class M64 {
  static mul32(a, b) {
    const [aH, aL] = [(a >> 16) & 0xffff, a & 0xffff];
    const [bH, bL] = [(b >> 16) & 0xffff, b & 0xffff];
    const c = aH * bL + aL * bH;
    return [aH * bH + (c >> 16), aL * bL + (c << 16)];
  }
  static imul32(a, b) {
    return M64.mul32(a, b)[1];
  }
  static add64([aH, aL], [bH, bL]) {
    return [(aH + bH) >>> 0, (aL + bL) >>> 0];
  }
  static mul64([aH, aL], [bH, bL]) {
    const [cH, cL] = M64.add64(M64.mul32(aH, bL), M64.mul32(aL, bH));
    return [
      M64.add64(M64.mul64(aH, bH), [0, cH]),
      M64.add64(M64.mul64(aL, bL), [cL, 0]),
    ];
  }
  static imul64(a, b) {
    return M64.mul64(a, b)[1];
  }
  static shift64([aH, aL], l) {
    if (l > 0) return [aH >> l, (aH << (32 - l)) | (aL >> l)];
    if (l < 0) return [(aH << -l) | (aL >> (32 + l)), aL << -l];
    return arguments;
  }
  static xor64([aH, aL], [bH, bL]) {
    return [aH ^ bH, aL ^ bL];
  }
  static divmod(x, y) {
    const rem = x % y;
    return [(x - rem) / y, rem];
  }
}

class PRNG {
  static hash32(str) {
    let hash = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++)
      (hash = M64.imul32(hash ^ str.charCodeAt(i), 3432918353)),
        (hash = (hash << 13) | (hash >>> 19));
    return hash;
  }
  static get max32() {
    return 0xffffffff;
  }
  static hash64(str) {
    const nL = PRNG.hash32(str),
      nH = PRNG.hash32(nL + str);
    return [nL, nH];
  }
  static get max64() {
    return [PRNG.max32, PRNG.max32];
  }
  static from(seed = new Date().toString()) {
    const RNG = new PRNG();
    RNG.s0 = PRNG.hash64(seed);
    RNG.s1 = PRNG.hash64(RNG.s0 + seed);
    return RNG;
  }
  constructor([s0H, s0L] = [], [s1H, s1L] = []) {
    this.s0 = [s0H, s0L];
    this.s1 = [s1H, s1L];
  }
  pick(array) {
    const index = this.rand32 % array.length,
      picked = array[index];
    if (index !== array.length - 1) array[index] = array.pop();
    else array.pop();
    return picked;
  }
  select(object) {
    const key = this.pick(_.keys(object)),
      selected = object[key];
    delete object[key];
    return [key, selected];
  }
  get copy() {
    const RNG = new PRNG();
    return Object.assign(RNG, this);
  }
  get rand() {
    return this.rand32 / PRNG.max32;
  }
  get rand32() {
    return this.rand64[0];
  }
  get rand64() {
    let [x, y] = [this.s0, this.s1];
    x = M64.xor64(x, M64.shift64(x, -23));
    [this.s0, this.s1] = [
      this.s1,
      M64.xor64(
        M64.xor64(x, y),
        M64.xor64(M64.shift64(x, 17), M64.shift64(y, 26))
      ),
    ];
    return M64.add64(this.s1, y);
  }
  get randhex() {
    const toHex = (n) => (0x100000000 + n).toString(16).substr(-8),
      [nH, nL] = this.rand64;
    return toHex(nH) + toHex(nL);
  }
  get recover() {
    return [this.s0, this.s1];
  }
}
module.exports.PRNG = PRNG;

class Maze {
  // prettier-ignore
  static dxdy = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  // prettier-ignore
  static dXdY = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  static isEdge(X, Y) {
    return (x, y) => x++ <= 0 || x >= X || y++ <= 0 || y >= Y;
  }
  static generate(nX, nY, X, Y, RNG = PRNG.from(), loss1, loss2) {
    const cross = new Maze(nX * 2 + 1, nY * 2 + 1, RNG);
    cross.make(1, 1).loss(loss1);
    const isEdge = Maze.isEdge(X, Y),
      isOut = Maze.isEdge(nX * X, nY * Y),
      isWall = (x, y) => {
        if (isOut(x, y)) return true;
        let [wx, rx] = M64.divmod(x, X),
          [wy, ry] = M64.divmod(y, Y);
        if (!isEdge(rx, ry)) return false;
        if (isEdge(rx, rx) && isEdge(ry, ry)) return true;
        wx = wx * 2 + isEdge(rx, rx) * (Boolean(rx) * 2 - 1) + 1;
        wy = wy * 2 + isEdge(ry, ry) * (Boolean(ry) * 2 - 1) + 1;
        return !cross.look(wx, wy);
      };
    const terrain = new Maze(nX * X, nY * Y, RNG, isWall);
    terrain.make().trim(5).loss(loss2).grow(7).trim(5);
    return terrain.split(X, Y);
  }
  constructor(X, Y, RNG = PRNG.from(), isWall = Maze.isEdge(X, Y)) {
    [this.X, this.Y, this.RNG, this.isWall] = [X, Y, RNG, isWall];
    this.data = _.map(Array(this.Y), () => Array(this.X).fill(false));
  }
  get array() {
    const draw = (sym) => (sym === true ? ` ` : `▊`);
    return _.map(this.data, (row) => _.map(row, draw));
  }
  get print() {
    const join = (row) => _.join(row, ``);
    return `|${_.join(_.map(this.array, join), `|\n|`)}|`;
  }
  look(x, y) {
    if (this.isWall(x, y)) return 0.3;
    return (this.data[y] || [])[x];
  }
  count(x, y, set = Maze.dxdy) {
    return _.sumBy(set, ([dx, dy]) => {
      const value = this.look(x + dx, y + dy);
      return value ? Number(value) : 0;
    });
  }
  make(x = this.RNG.rand32 % this.X, y = this.RNG.rand32 % this.Y) {
    const frontier = Array(),
      expand = (x, y) => (
        (this.data[y][x] = true),
        _.forEach(Maze.dxdy, ([dx, dy], dir) => {
          if (this.look(x + dx * 2, y + dy * 2) === false)
            frontier.push([x + dx * 2, y + dy * 2, dir]);
        })
      );
    while (this.isWall(x, y))
      [x, y] = [this.RNG.rand32 % this.X, this.RNG.rand32 % this.Y];
    expand(x, y);
    while (frontier.length > 0) {
      const [x, y, dir] = this.RNG.pick(frontier),
        [dx, dy] = Maze.dxdy[dir ^ 2];
      if (this.look(x, y) === false)
        (this.data[y + dy][x + dx] = true), expand(x, y);
    }
    return this;
  }
  trim(round) {
    _.forEach(_.range(round), () => {
      this.data = _.map(this.data, (row, y) =>
        _.map(row, (v, x) => (v ? this.count(x, y) >= 2 : false))
      );
    });
    return this;
  }
  grow(round) {
    _.forEach(_.range(round), () => {
      this.data = _.map(this.data, (row, y) =>
        _.map(row, (v, x) =>
          v ? true : !this.isWall(x, y) && this.count(x, y, Maze.dXdY) >= 4
        )
      );
    });
    return this;
  }
  split(divX = 2, divY = divX) {
    const cuts = (div, size) =>
        _.map(_.range(size / div), (x) => [x * div, (x + 1) * div]),
      cut = (div, size, rect) =>
        _.map(cuts(div, size), ([s, e]) =>
          _.map(rect, (row) => _.slice(row, s, e))
        );
    return _.map(_.map(cut(divY, this.Y, [this.data]), _.head), (rect) =>
      _.map(cut(divX, this.X, rect), (data) =>
        Object.assign(
          new Maze(_.head(data).length, data.length, this.RNG.copy),
          { data }
        )
      )
    );
  }
  loss(rate) {
    this.data = _.map(this.data, (row) =>
      _.map(row, (v) => (v ? this.RNG.rand > -rate : this.RNG.rand < rate))
    );
    return this;
  }
}
module.exports.Maze = Maze;
