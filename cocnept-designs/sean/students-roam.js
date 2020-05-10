import {WrappedCanvas} from './canvas-stuff.js';
import {Panner} from './panner.js';

import {WIDTH, HEIGHT, loadImages, getSprite} from '../../characters/sprites/sprite.js';
import {randomSprite} from '../../characters/sprites/random-sprite.js';
import {SpriteCache} from '../../characters/sprites/sprite-cache.js';

import * as FINDER from '../../pathfinding/finder.js';

import {frame} from '../../utils.js';

const WIGGLE_RADIUS = 1;

let width = 10;
let height = 5;
function isAccessible({x, y}) {
    return x >= 0 && x < width &&
        y >= 0 && y < height &&
        (x < 6 || y > 2);
}
function getRandomPosition() {
    let position;
    do {
        position = {
            x: Math.random() * width | 0,
            y: Math.random() * height | 0
        };
    } while (!isAccessible(position));
    return position;
}

class Student {
    constructor({
        speed=0.002
    }={}) {
        this.speed = speed;

        // The current or old* position of the student (*old if the student is walking between tiles)
        this.current = {x: 0, y: 0};
        // List of next tiles to go to
        this._path = [];
        // Distance walked between two tiles
        this._distance = null;
        // Distance to the next tile
        // Use this to determine if it is walking
        this._distanceToNext = null;
        // Time until movement
        this._timeUntilMovement = 0;
        // Sprite ID in a sprite cache
        this.spriteId = null;
    }

    goToRandomPosition() {
        this.current = getRandomPosition();
        return this;
    }

    setDestination({x: destX, y: destY}) {
        let {x, y} = this.current;
        let success = FINDER.simple(
            new FINDER.Node(Math.floor(x), Math.floor(y)),
            new FINDER.Node(destX, destY),
            isAccessible
        );
        if (success !== -1) {
            this._path = [];
            let temp = success;
            while (temp.parent) {
                this._path.unshift({
                    x: temp.x + (2 * WIGGLE_RADIUS - WIGGLE_RADIUS) * Math.random(),
                    y: temp.y + (2 * WIGGLE_RADIUS - WIGGLE_RADIUS) * Math.random()
                });
                temp = temp.parent;
            }
        }
        return this;
    }

    simulate(elapsedTime) {
        if (this._distanceToNext === null) {
            this._timeUntilMovement -= elapsedTime;
            if (this._timeUntilMovement < 0) {
                this.setDestination(getRandomPosition());
                // TODO: Better way to set idle time?
                this._timeUntilMovement = Math.random() * 4000 + 1000;
            }
        } else {
            this._distance += elapsedTime * this.speed;
        }
        return this;
    }

    updatePath() {
        if (this._distanceToNext !== null) {
            if (this._distance > this._distanceToNext) {
                // The student has finished walking to the next tile.
                this._distance -= this._distanceToNext;
                this.current = this._path.shift();
                this._distanceToNext = null;
            }
        }
        if (this._distanceToNext === null) {
            if (this._path[0]) {
                if (this._distance === null) {
                    this._distance = 0;
                }
                let {x, y} = this.current;
                let next = this._path[0];
                this._distanceToNext = Math.hypot(x - next.x, y - next.y);
            }
        }
        return this;
    }

    calculateVisualPosition() {
        let {x, y} = this.current;
        if (this._distanceToNext !== null) {
            let next = this._path[0];
            let progress = this._distance / this._distanceToNext;
            x += (next.x - x) * progress;
            y += (next.y - y) * progress;
        }
        y += 0.5 - HEIGHT / WIDTH;
        this.visual = {x, y};
    }
}

export default async function main(wrapper) {
    let wrappedCanvas = new WrappedCanvas(wrapper);

    let topHeightPadding = HEIGHT / WIDTH - 0.5;
    let panner = new Panner({
        canvas: wrappedCanvas,
        width,
        height: height + topHeightPadding
    });
    let c = wrappedCanvas.context;
    let lastTime;
    let ready = false;

    let students = [];
    let spriteCache;
    for (let i = 0; i < 10; i++) {
        students.push(new Student().goToRandomPosition());
    }
    spriteCache = new SpriteCache(students.length);

    function paint() {
        let now = Date.now();
        let elapsedTime = now - lastTime;
        if (elapsedTime < 500) {
            panner.time += elapsedTime;
        }
        lastTime = now;

        let {offsetX, offsetY, scale} = panner.getTransform();
        c.clearRect(0, 0, wrappedCanvas.width, wrappedCanvas.height);
        c.save();
        c.imageSmoothingEnabled = false;
        c.translate(offsetX, offsetY + topHeightPadding * scale);
        c.scale(scale, scale);

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                c.fillStyle = isAccessible({x, y}) ? 'black' : 'grey';
                c.fillRect(x, y, 1, 1);
            }
        }

        for (let student of students) {
            student
                .simulate(elapsedTime)
                .updatePath()
                .calculateVisualPosition()
        }
        students.sort((a, b) => a.visual.y - b.visual.y);
        for (let {spriteId, visual: {x, y}} of students) {
            spriteCache.draw(c, spriteId, x, y, 1, HEIGHT / WIDTH);
        }

        c.restore();
    }

    window.addEventListener('resize', async e => {
        await wrappedCanvas.resize();
        if (ready) paint();
    });

    await Promise.all([
        wrappedCanvas.resize(),
        loadImages()
    ]);

    for (let student of students) {
        student.spriteId = spriteCache.add(getSprite(randomSprite()));
    }

    lastTime = Date.now();

    ready = true;
    while (true) {
        paint();
        await frame();
    }
}
