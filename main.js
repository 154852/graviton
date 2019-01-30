const size = 10000;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, size * 4);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const skybox = new THREE.Mesh(new THREE.CubeGeometry(size * 3, size * 3, size * 3), 
	[new THREE.MeshBasicMaterial({
		map: new THREE.TextureLoader().load('res/bkg/v2/bkg1_back.png'),
		side: THREE.BackSide,
		fog: false
	}),
	new THREE.MeshBasicMaterial({
		map: new THREE.TextureLoader().load('res/bkg/v2/bkg1_front.png'),
		side: THREE.BackSide,
		fog: false
	}),	
	new THREE.MeshBasicMaterial({
		map: new THREE.TextureLoader().load('res/bkg/v2/bkg1_top.png'),
		side: THREE.BackSide,
		fog: false
	}),
	new THREE.MeshBasicMaterial({
		map: new THREE.TextureLoader().load('res/bkg/v2/bkg1_bottom.png'),
		side: THREE.BackSide,
		fog: false
	}),
	new THREE.MeshBasicMaterial({
		map: new THREE.TextureLoader().load('res/bkg/v2/bkg1_right.png'),
		side: THREE.BackSide,
		fog: false
	}),
	new THREE.MeshBasicMaterial({
		map: new THREE.TextureLoader().load('res/bkg/v2/bkg1_left.png'),
		side: THREE.BackSide,
		fog: false
	})]
);
scene.add(skybox);

scene.fog = new THREE.Fog(0x000000, size * 0.5, size * 1.5);

scene.add(new THREE.AmbientLight(0x404040));

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableKeys = false;

camera.position.y = 300;
camera.lookAt(new THREE.Vector3(0, 0, 0));

let planets, _speed = 1, run = false, lock = null, lockOffset = null;

Object.defineProperty(window, 'speed', {
	get: function() {
		return _speed || 1;
	},
	set: function(x) {
		_speed = x;
		document.querySelector('.speed').innerText = Math.round(_speed * 10000) / 10000;
	}
});
function update(force) {
	if (run || force == true) {
		for (let i = 1; i < planets.length; i++) planets[i].update(planets[0], speed * 10000);
	}

	if (lock != null) {
		controls.target.set(lock.group.position.x, lock.group.position.y, lock.group.position.z);

		const now = Date.now() * 0.0002;
		const radius = lock.graphicalRadius * 2.5;

		camera.position.set(lock.group.position.x + (Math.sin(now) * radius), lock.group.position.y + (radius * 0.7), lock.group.position.z + (Math.cos(now) * radius));
		controls.update();
	}

	skybox.position.set(camera.position.x, camera.position.y, camera.position.z);

	renderer.render(scene, camera);

	if (force != true) requestAnimationFrame(update);
}

for (let i = 0; i < 30; i++) {
	const light = new THREE.PointLight(0xffffff, 0.5, 2000, 1);
	light.position.set(
		(Math.random() - 0.5) * size,
		(Math.random() - 0.5) * size,
		(Math.random() - 0.5) * size
	);

	const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
	sphere.position.set(light.position.x, light.position.y, light.position.z);

	scene.add(sphere);
	scene.add(light);
}

const xhr = new XMLHttpRequest();
xhr.onload = () => {
	const json = JSON.parse(xhr.responseText);

	planets = [];
	for (const jsonPart of json) {
		const planet = new Planet(jsonPart, planets.length, planets[0]);
		scene.add(planet.getMesh());

		planets.push(planet);
	}

	const searchFuse = new Fuse(planets, {
		shouldSort: true,
		threshold: 0.3,
		location: 0,
		distance: 100,
		maxPatternLength: 32,
		minMatchCharLength: 1,
		keys: [
			{
				name: 'name',
				weight: 1
			}, {
				name: 'density',
				weight: 0.1
			}, {
				name: 'radius',
				weight: 0.1
			}
		]
	});

	const resultsElement = document.querySelector('.search-results');
	document.querySelector('.search input').addEventListener('input', function(event) {
		resultsElement.innerHTML = '';

		if (this.value.length < 3) {
			this.classList.add('close');
			return;
		} else this.classList.remove('close');

		const results = searchFuse.search(this.value);

		for (const result of results) {
			const div = document.createElement('div');
			div.innerText = result.name;

			div.onclick = () => open(result.id);

			resultsElement.appendChild(div);
		}
	});

    update();
}
xhr.open('GET', 'planets.json');
xhr.send();

function open(id) {
	lock = planets[id];
	controls.enabled = false;

	cancel = function() {
		lock = null;
		close = null;
		controls.enabled = true;
	};

	document.querySelector('.cancel').classList.remove('hidden');
}

let cancel = null;

function doCancel() {
	cancel();
	document.querySelector('.cancel').classList.add('hidden')
	cancel = null;
}

window.addEventListener('keyup', function(event) {
	if (event.keyCode == 27 && cancel != null) doCancel();
});

window.addEventListener('click', function(event) {
	if (event.path[0] != document.activeElement)
		document.activeElement.blur();
})