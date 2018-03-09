'use strict'


const createScatter = reqiure('regl-scatter2d')


module.exports = createMatrix


function ReglMatrix (regl) {
	// batch groups to render
	this.groups = []

	// main scatter drawing instance
	this.scatter = createScatter()

	// dimensions buffer for data intersections
	this.buffer = regl.buffer()
}


// ReglMatrix.prototype = Object.create(ReglScatter)


ReglMatrix.prototype.update = function (options) {
	if (!options) return

	// direct points argument
	if (options.length != null) {
		if (typeof options[0] === 'number') options = [{positions: options}]
	}
	// make options a batch
	else if (!Array.isArray(options)) options = [options]
}

ReglMatrix.prototype.draw = function () {

}

ReglMatrix.prototype.destroy = function () {

}
