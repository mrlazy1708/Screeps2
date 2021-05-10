`use strict`;

const _ = require(`lodash`);
const utils = require(`./utils`);

class CA {
    // prettier-ignore
    static dxdy = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    // prettier-ignore
    static dadb = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    static random(width, height, RNG = utils.PRNG) {
        return _.map(_.range(height), (y) =>
            _.map(
                _.range(width),
                (x) => RNG.hash32(`${x} ${y} ${new Date()}`) > RNG.max32 * 0.4
            )
        );
    }
    constructor(width, height, init = CA.random(width, height)) {
        this.width = width;
        this.height = height;
        this.data = init;
    }
    look(x, y) {
        return (this.data[y] || [])[x] ? 1 : 0;
    }
    step() {
        this.data = _.map(_.range(this.height), (y) =>
            _.map(_.range(this.width), (x) => {
                const sum = _.sumBy(CA.dxdy, ([dx, dy]) =>
                    this.look(x + dx, y + dy)
                );
                return this.look(x, y)
                    ? true
                    : Math.random() >= 0.8 && sum <= 1;
                // return this.look(x, y) ? sum >= 1 && sum <= 4 : sum === 3;
            })
        );
    }
    crop() {
        this.data = _.map(_.range(this.height), (y) =>
            _.map(_.range(this.width), (x) => {
                const sum = _.sumBy(CA.dadb, ([dx, dy]) =>
                    this.look(x + dx, y + dy)
                );
                return this.look(x, y) ? sum >= 1 : false;
            })
        );
    }
    get print() {
        return `|${_.join(
            _.map(this.data, (row) =>
                _.join(
                    _.map(row, (cell) => (cell ? `x` : ` `)),
                    ``
                )
            ),
            `|\n|`
        )}|`;
    }
}

const ca = new CA(80, 30);
_.forEach(_.range(100), () => ca.step());
// setInterval(() => (ca.step(), console.log(ca.print)), 100);
setInterval(() => (console.log(ca.print), ca.crop()), 1000);
