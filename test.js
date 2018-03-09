'use strict'

const regl = require('regl')({ extensions: 'oes_element_index_uint'})
const createSettings = require('settings-panel')
const createMatrix = require('./')
const panzoom = require('pan-zoom')
const random = require('gauss-random')
const fps = require('fps-indicator')('bottom-right')


// create splom instance
let splom = createMatrix(regl)


// data for the splom
let traces = []


// create settings panel & bind
let settings = createSettings({
	traces: { value: 3, min: 1, max: 10, type: 'number' },
	variables: { value: 4, min: 1, max: 100, type: 'number' },
	points: { value: 1e4, min: 1, max: 1e7, type: 'number' },
	snap: { value: false }
}, {
	position: 'center bottom'
})

settings.on('change', update)


// regenerate the data based on options
function update () {
	let o = settings.values

	// set proper number of traces
	if (o.traces < traces.length) {
		traces.length = o.traces
	}
	else {
		for (let i = traces.length; i < o.traces; i++) {
			traces.push(generateTrace(o.variables, o.points))
		}
	}

	function generateTrace(vars, points) {
		let data = []
		for (let i = 0; i < vars; i++) {
			let row = []
			data.push(row)
			for (let j = 0; j < points; j++) {
				row.push(random())
			}
		}

		return data
	}

	// update splom based on traces
	splom.update(...traces)
}


// redraw the frame based on data
function draw () {
	splom.draw()
}
