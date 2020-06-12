let paths = [
    'smoker'
];
let images = {};
function loadImages() {
    return Promise.all(paths.map(path => new Promise(resolve => {
        let img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = new URL(`./images/${path}.png`, import.meta.url);
        img.onload = resolve;

        images[path] = img;
    })));
}

// coordinates are all at the center of the images

const SCALE = 5;

let objects = [];
let canvas, ctx;
let mouse = {
    down: false,
    x: 0,
    y: 0
}
let selected;

function updateMouse(e, d) {
	console.log('aa')
	let old = { x: mouse.x, y: mouse.y };
	mouse.x = e.offsetX;
	mouse.y = e.offsetY;
	console.log(mouse)
	if (d && !mouse.down) {
		for (let i = 0; i < objects.length; i++) {
			if (isInHitbox(objects[i])) {
				selected = objects[i];
				objects.sort((x, y) => x === selected ? -1 : y === selected ? 1 : 0);
				break;
			}
		}
	} else if (selected && d === undefined) {
		selected.x += mouse.x - old.x;
		selected.y += mouse.y - old.y;
	} else if (!d) {
		selected = null;
	}
	mouse.down = d === undefined ? mouse.down : d;
}

function setCanvas(c) {
    canvas = c;
    ctx = c.getContext('2d');
    //ctx.imageSmoothingEnabled = false;

    canvas.addEventListener('mousedown', function(e) { updateMouse(e, true) });
    canvas.addEventListener('mousemove', function(e) { updateMouse(e) });
    canvas.addEventListener('mouseleave', function(e) { updateMouse(e, false) });
    canvas.addEventListener('mouseup', function(e) { updateMouse(e, false) });
}

function isInHitbox(object) {
    return mouse.x > object.x - SCALE * object.image.width / 2 &&
        mouse.x < object.x + SCALE * object.image.width / 2 &&
        mouse.y > object.y - SCALE * object.image.height / 2 &&
        mouse.y < object.y + SCALE * object.image.height / 2;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    ctx.fillStyle = canRelease() ? '#222' : '#221';
    ctx.fillRect(
		0, canvas.height / 2 / window.devicePixelRatio,
		canvas.width / window.devicePixelRatio, canvas.height / 2 / window.devicePixelRatio);

    for (let i = objects.length - 1; i > -1; i--) {
        drawImage(objects[i], i === 0);
    }

    ctx.fillStyle = mouse.down ? '#f00' : '#000';
    ctx.fillRect(mouse.x - 2, mouse.y - 2, 4, 4);
}

function drawImage(object, outline) {
    ctx.drawImage(
        object.image,
        object.x - SCALE * object.image.width / 2, object.y - SCALE * object.image.height / 2,
        SCALE * object.image.width, SCALE * object.image.height);
    if (outline) {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            object.x - SCALE * object.image.width / 2 - 5,
            object.y - SCALE * object.image.height / 2 - 5,
            SCALE * object.image.width + 10,
            SCALE * object.image.height + 10);
    }
}

function canRelease() {
    for (let i = 0; i < objects.length; i++) {
        if (objects[i].y > canvas.height / 2 / window.devicePixelRatio) {
            return false;
        }
    }
    return true;
}

export {
	loadImages,
	setCanvas,
	draw,
	images,
	objects
};