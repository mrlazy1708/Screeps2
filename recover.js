`use strict`;

const fs = require(`fs`);

class Recover {
    constructor(callback, dirFile) {
        this.dirs = dirFile;
        this.mkdirFile(());
    }
    read(callback) {
        this.callback = callback;
        if ()this.mkdirFile(this.readFile);
    }
    write(callback, content) {
        this.callback = callback;
        this.content = content;
        this.mkdirFile(this.writeFile);
    }
    mkdirFile(action) {
        const dir = /(.*)\/.*/.exec(this.dirs[1])[1];
        fs.mkdir(dir, this.statFile.bind(this, action), {
            recursive: true,
        });
    }
    statFile(action, _err) {
        fs.stat(this.dirs[1], openFile.bind(this, action));
    }
    openFile(action, _err, stat) {
        if (stat && stat.isFile())
            fs.open(this.dirs[1], `r+`, action.bind(this, stat.size));
        else fs.copyFile(...this.dirs, 0, this.statFile.bind(this, action));
    }
    readFile(size, err, fd) {
        if (err) throw new Error(err);
        this.fd = fd;
        const buffer = new Buffer.alloc(size);
        fs.read(fd, buffer, 0, size, 0, callback);
    }
    writeFile(size, err, fd) {}
}

module.exports = Recover;
