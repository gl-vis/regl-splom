'use strict'

const regl = require('regl')({ extensions: 'oes_element_index_uint' })
const createSettings = require('../settings-panel')
const createMatrix = require('./')
const panzoom = require('pan-zoom')
const random = require('gauss-random')
const fps = require('fps-indicator')('bottom-right')


// create splom instance
let splom = createMatrix(regl)


// data for the splom
let passes = []


// create settings panel & bind
let settings = createSettings({
	traces: { value: 1, min: 1, max: 10, type: 'text' },
	variables: { value: 4, min: 1, max: 100, type: 'text' },
	points: { value: 1e3, min: 1, max: 1e6, type: 'text' },
	// snap: { value: false }
}, {
	position: 'center bottom',
	background: 'transparent',
	orientation: 'horizontal'
})

settings.on('change', update)


// regenerate the data based on options
function update () {
	let {traces, variables, points} = settings.values
	traces = parseInt(traces)
	variables = parseInt(variables)
	points = parseInt(points)

	if (traces < passes.length) {
		passes.length = traces
	}

	for (let i = 0; i < traces; i++) {
		let pass = (passes[i] || (passes[i] = {}))

		if (!pass.data) pass.data = []
		if (pass.data.length > variables) pass.data.length = variables

		for (let col = 0; col < variables; col++) {
			if (!pass.data[col]) {
				pass.data[col] = []
				pass.data[col].mean = Math.random()
				pass.data[col].sdev = Math.random()
			}
			let colData = pass.data[col]
			let {mean, sdev} = colData
			if (colData.length > points) colData.length = points
			for (let i = colData.length; i < points; i++) {
				colData[i] = random() * sdev + mean
			}
		}
	}

	// update splom based on traces
	splom.regl.clear({ color: [0,0,0,0] })
	splom.update(...passes)//.draw()
setTimeout(() => {
	splom.regl.clear({ color: [0,0,0,0]})
	splom.draw()
}, 300)
}

update()


