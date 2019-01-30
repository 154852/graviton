class UniverseScene {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1,  UniverseScene.scale * 4);

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.skyBox = UniverseScene.getSkyBox(null, UniverseScene.scale);
        this.scene.add(this.skyBox);
        this.scene.fog = new THREE.Fog(0x000000,  UniverseScene.scale * 0.5,  UniverseScene.scale * 1.5);
        this.scene.add(new THREE.AmbientLight(0x404040));

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableKeys = false;

        this.camera.position.y = 700;
        this.camera.position.x = -400;
        this.camera.lookAt(0, 0, 0);

        for (let i = 0; i < 30; i++) {
            const light = new THREE.PointLight(0xffffff, 0.5, 2000, 1);
            light.position.set(
                (Math.random() - 0.5) * UniverseScene.scale,
                (Math.random() - 0.5) * UniverseScene.scale,
                (Math.random() - 0.5) * UniverseScene.scale
            );
        
            const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            sphere.position.set(light.position.x, light.position.y, light.position.z);
        
            this.scene.add(sphere);
            this.scene.add(light);
        }
    }

    add(planets) {
        planets.forEach((planet) => {
            this.scene.add(planet.getMesh());
        });
    }

    update(ui) {
        if (ui.lockedPlanet != null) {
            this.controls.target.set(
                ui.lockedPlanet.group.position.x,
                ui.lockedPlanet.group.position.y,
                ui.lockedPlanet.group.position.z
            );

            const now = Date.now() * 0.0002;
            const radius = ui.lockedPlanet.graphicalRadius * 2.5;

            this.camera.position.set(
                ui.lockedPlanet.group.position.x + (Math.sin(now) * radius),
                ui.lockedPlanet.group.position.y + (radius * 0.7),
                ui.lockedPlanet.group.position.z + (Math.cos(now) * radius)
            );
            this.controls.update();
        }

        this.skyBox.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
        this.renderer.render(this.scene, this.camera);
    }
}
UniverseScene.scale = 10000;

UniverseScene.getSkyBox = function(name, size) {
    name = name || 'v2';

    return new THREE.Mesh(new THREE.CubeGeometry(size * 3, size * 3, size * 3), [
        new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load(`res/bkg/${name}/bkg1_back.png`),
            side: THREE.BackSide,
            fog: false
        }),
        new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load(`res/bkg/${name}/bkg1_front.png`),
            side: THREE.BackSide,
            fog: false
        }),	
        new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load(`res/bkg/${name}/bkg1_top.png`),
            side: THREE.BackSide,
            fog: false
        }),
        new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load(`res/bkg/${name}/bkg1_bottom.png`),
            side: THREE.BackSide,
            fog: false
        }),
        new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load(`res/bkg/${name}/bkg1_right.png`),
            side: THREE.BackSide,
            fog: false
        }),
        new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load(`res/bkg/${name}/bkg1_left.png`),
            side: THREE.BackSide,
            fog: false
        })
    ]);
}

class PlanetsHandler {
    constructor(path, cb) {
        this.planets = [];

        this.xhr = new XMLHttpRequest();
        this.xhr.onload = () => {
            const json = JSON.parse(this.xhr.responseText);

            json.forEach((elem) => {
                const planet = new Planet(elem, this.planets.length, this.planets[0]);
                this.planets.push(planet);
            });

            this.searchFuse = new Fuse(this.planets, {
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

            cb(this.planets);
        };
        this.xhr.open('GET', path);
        this.xhr.send();

        this.small = false;
    }

    search(value) {
        return this.searchFuse.search(value);
    }

    isComplete() {
        return this.xhr.status != 0;
    }

    update(count) {
        for (let i = 1; i < this.planets.length; i++) {
            if (this.small) {
                for (let x = 0; x < count; x += 10000) {
                    this.planets[i].update(this.planets[0], 10000);
                }
            } else {
                this.planets[i].update(this.planets[0], count);
            }
        }
    }
}

class UI {
    constructor() {
        this.lockedPlanet = null;
        this.universeScene = new UniverseScene();
        this.planetHandler = new PlanetsHandler('planets.json', (x) => this.universeScene.add(x));
        this.cancel = null;
        this._speed = 1;
        this.run = false;

        document.body.appendChild(this.universeScene.renderer.domElement);

        window.addEventListener('keyup', (event) => {
            if (event.keyCode == 27 && this.cancel != null) this.doCancel();
        });
        
        window.addEventListener('click', (event) => {
            if (event.path[0] != document.activeElement) document.activeElement.blur();
        });

        const that = this;
        const resultsElement = document.querySelector('.search-results');
        document.querySelector('.settings-wrapper input').addEventListener('input', function(event) {
            resultsElement.innerHTML = '';

            if (this.value.length < 1) {
                this.classList.add('close');
                return;
            } else this.classList.remove('close');

            const results = that.planetHandler.search(this.value);
            results.forEach((result) => {
                const div = document.createElement('div');
                div.innerText = result.name;
                div.onclick = () => that.open(result.id);
                resultsElement.appendChild(div);
            });
        });
    }

    get speed() {
        return this._speed || 1;
    }

    set speed(value) {
        this._speed = value
        document.querySelector('.speed').innerText = Math.round(this._speed * 10000) / 10000;

        return value;
    }

    doPhysicsUpdate(time) {
        this.planetHandler.update(time * this.speed * 1e6);
    }

    loop() {
        let last = -1;

        const loop = (time) => {
            time /= 1000;

            if (this.run || last == -1) this.doPhysicsUpdate(time - last);
            this.universeScene.update(this);
            
            last = time;
            requestAnimationFrame(loop)
        };

        loop(Date.now());
    }

    doCancel() {
        this.cancel();
        document.querySelector('.cancel').classList.add('hidden')
        this.cancel = null;
    }

    open(id) {
        this.lockedPlanet = this.planetHandler.planets[id];
        this.universeScene.controls.enabled = false;
    
        this.cancel = () => {
            this.lockedPlanet = null;
            this.universeScene.controls.enabled = true;

            document.querySelector('.desc').classList.add('hidden');
        };
    
        document.querySelector('.cancel').classList.remove('hidden');

        if (this.lockedPlanet.table != null) {
            const desc = document.querySelector('.desc');
            const table = desc.querySelector('table');
            table.innerHTML = '';

            desc.querySelector('h2').innerText = this.lockedPlanet.name;

            this.lockedPlanet.table.forEach((row) => {
                const tr = document.createElement('tr');
                const th = document.createElement('th');
                th.innerHTML = row[0];
                tr.appendChild(th);

                const td = document.createElement('td');
                td.innerHTML = row[1];
                tr.appendChild(td);

                table.appendChild(tr);
            })

            desc.classList.remove('hidden');
        } else {
            document.querySelector('.desc').classList.add('hidden');
        }
    }
}

const ui = new UI()
ui.loop();