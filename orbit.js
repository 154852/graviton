Math.G = 6.6742e-11;

class Vector3 {
    /**
     * @param {Number | [Number, Number, Number] | Vector3} x X position or array
     * @param {Number?} y Y position
     * @param {Number?} z Z position
     */
    constructor(x, y, z) {
        if (x.constructor == Number) {
            this.x = x;
            this.y = y;
            this.z = z;
        } else if (x.constructor == Vector3) {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
        } else {
            this.x = x[0];
            this.y = x[1];
            this.z = x[2];
        }
    }

    /**
     * Divides all of x, y and z by the scalar
     * @param {Number} scalar Division Scalar
     * @returns {Vector3} New vector
     */
    divScalar(scalar) {
        return new Vector3(this.x / scalar, this.y / scalar, this.z / scalar);
    }

    /**
     * Multiplies all of x, y and z by the scalar
     * @param {Number} scalar Multiplication Scalar
     * @returns {Vector3} New vector
     */
    mulScalar(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    /**
     * Calculates the distance between the vectors
     * @param {Vector3} vector Other vector
     * @returns {Number}
     */
    distanceTo(vector) {
        return Math.sqrt(((this.x - vector.x) ** 2) + ((this.y - vector.y) ** 2) + ((this.z - vector.z) ** 2));
    }

    /**
     * Adds together vectors
     * @param {Vector3} vector Vector to add
     * @returns {Vector3} 
     */
    add(vector) {
        return new Vector3(this.x + vector.x, this.y + vector.y, this.z + vector.z);
    } 

    /**
     * Subtracts vectors
     * @param {Vector3} vector Vector to substract
     * @returns {Vector3} 
     */
    min(vector) {
        return new Vector3(this.x - vector.x, this.y - vector.y, this.z - vector.z);
    } 

    /**
     * Absolutes vector
     * @returns {Vector3} Absolute of this vector
     */
    abs() {
        return new Vector3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
    }

    /**
     * Finds the magnitude of the vector
     * @returns {Number}
     */
    magnitude() {
        return this.distanceTo({x: 0, y: 0, z: 0});
    }

    /**
     * Normalises this vector
     * @returns {Vector3}
     */
    normalise() {
        return this.divScalar(this.magnitude());
    }
}

/**
 * @property {Vector3} velocity
 */
class Planet {
    /**
     * @param {{name: String, density: Number, radius: Number, color: String, offsetRadius: Number, graphicalRadius: Number, initialV: Number, light?: Number}} jsonElement JSON data for planet
     * @param {Planet?} sun Sun
     */
    constructor(jsonElement, id, sun) {
        this.name = jsonElement.name;
        this.density = jsonElement.density * 1000; // kg/m^3
        this.radius = jsonElement.radius * 1000; // m
        this.color = jsonElement.color;
        this.graphicalRadius = jsonElement.graphicalRadius || (this.radius / 1000000);
        this.light = jsonElement.light || 0;
        this.path = jsonElement.path;
        this.id = id;

        this.currentPosition = jsonElement.position || new Vector3(jsonElement.offsetRadius * 1000, 0, 0);
        this.velocity = jsonElement.velocity || new Vector3(0, 0, 0);

        if (sun) this.initialVelocity(this.currentPosition.magnitude(), sun);

        this.group = null;
    }

    initialVelocity(distance, planet2) { // checked
        const mag = Math.sqrt((Math.G * (planet2.mass() + this.mass())) / distance);
        this.velocity.y = mag;
    }

    getMesh() {
        this.group = new THREE.Group();

        const geom = new THREE.IcosahedronGeometry(this.graphicalRadius, 3);

        const matData = {
            flatShading: true
        };

        if (this.path != null) {
            matData.map = new THREE.TextureLoader().load('res/planets/' + this.path);
            this.color *= 0.6;
        }

        if (this.light != 0) {
            this.group.add(new THREE.PointLight(0xffffff, 1.5, 4000, 2));
        }

        matData.emissive = new THREE.Color(this.color);

        const mat = new THREE.MeshPhongMaterial(matData);

        this.group.add(new THREE.Mesh(geom, mat));

        this.updateGraphicalPosition();

        return this.group;
    }

    /**
     * Gets the current position
     * @returns {Vector3} The current position in meters
     */
    position() {
        return this.currentPosition;
    }

    /**
     * Calculates the mass of the planet
     * @returns {Number} The planets mass in kg
     */
    mass() {  // checked (2)
        return this.density * this.volume();
    }

    /**
     * Calculates the volume of the planet
     * @returns {Number} The planets volume in m^3
     */
    volume() { // checked (2)
        return (4 / 3) * Math.PI * (this.radius ** 3);
    }

    /**
     * Calculates the gravitation force on the given planet
     * @param {Planet} planet Other planet
     * @param {Number} radius Distance between planets
     * @return {Number} The force in newtons
     */
    forceOn(planet, radius) { // checked
        return -Math.G * this.mass() * planet.mass() / radius ** 2;
    }

    /**
     * Runs update against given planet
     * @param {Planet} planet Other planet
     */
    update(planet, time) {
        this.velocity = this.velocity.add(this.getNewVelocity(planet, time));

        this.currentPosition = this.currentPosition.add(this.velocity.mulScalar(time));
        this.updateGraphicalPosition();
    }

    updateGraphicalPosition() {
        const vector = this.currentPosition.divScalar(Planet.scale / 2000);
        this.group.position.set(vector.x, vector.z, vector.y);
    }

    kineticEnergy() { // checked
        return 0.5 * this.mass() * this.velocity.magnitude();
    }

    gravitationalPotentialEnergy(planet) { // checked
        return -((Math.G * planet.mass() * this.mass()) / this.position().magnitude());
    }

    energy(planet) { // checked
        return this.kineticEnergy() + this.gravitationalPotentialEnergy(planet);
    }

    /**
     * Calculates a new velocity
     * @param {Planet} planet Planet to update against
     * @param {Number} time Time that passes
     */
    getNewVelocity(planet, time) {
        const difference = this.position().min(planet.position());
        return difference.mulScalar(time * (-Math.G * planet.mass() * (((difference.x ** 2) + (difference.y ** 2) + (difference.z ** 2)) ** -1.5)));
    }
}
Planet.scale = 590629248000;