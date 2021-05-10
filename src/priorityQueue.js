`use strict`;

const _ = require(`lodash`);

class priorityQueue {
  constructor(memory, predictor) {
    this.s = new Set(_.tail(memory));
    this.m = memory || [null];
    this.p = predictor || ((e1, e2) => e1 < e2);
  }
  push(element) {
    const [s, m, p] = [this.s, this.m, this.p];
    s.add(element), m.push(element);
    for (let i = m.length - 1; i > 1 && p(m[i], m[i >> 1]); i >>= 1)
      [m[i], m[i >> 1]] = [m[i >> 1], m[i]];
  }
  pop() {
    const [s, m, p] = [this.s, this.m, this.p];
    if (m.length <= 1) return undefined;
    else if (m.length == 2) {
      const ret = m.pop();
      s.delete(ret);
      return ret;
    } else {
      const ret = m[1];
      m[1] = m.pop();
      for (let i = 1; i << 1 < m.length - 1; ) {
        if (p(m[i << 1], m[i]) && p(m[i << 1], m[(i << 1) | 1])) {
          [m[i], m[i << 1]] = [m[i << 1], m[i]];
          i = i << 1;
        } else if (p(m[(i << 1) | 1], m[i])) {
          [m[i], m[(i << 1) | 1]] = [m[(i << 1) | 1], m[i]];
          i = (i << 1) | 1;
        } else break;
      }
      if (p(m[m.length - 1], m[m.length >> 1]))
        [m[m.length - 1], m[m.length >> 1]] = [
          m[m.length >> 1],
          m[m.length - 1],
        ];
      s.delete(ret);
      return ret;
    }
  }
  has(element) {
    return this.s.has(element);
  }
  get top() {
    return this.m[1];
  }
  get size() {
    return this.s.size;
  }
  get empty() {
    return this.size === 0;
  }
}

module.exports = priorityQueue;
