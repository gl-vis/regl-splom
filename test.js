'use strict'

const regl = require('regl')({ extensions: 'oes_element_index_uint' })
const createSettings = require('../settings-panel')
const createMatrix = require('./')
const panzoom = require('../pan-zoom')
const random = require('gauss-random')
const fps = require('fps-indicator')('bottom-right')
const alpha = require('color-alpha')
const palettes = require('nice-color-palettes')
const palette = palettes[Math.floor(Math.random() * palettes.length)]


// create splom instance
let splom = createMatrix(regl)


// data for the splom
let passes = []

// create settings panel & bind
let settings = createSettings({
	traces: { value: 2, min: 1, max: 10, type: 'range' },
	variables: { value: 8, min: 1, max: 100, type: 'range' },
	points: { value: 1e3, min: 1, max: 1e4, type: 'range' },
	// snap: { value: false }
}, {
	position: 'center bottom',
	background: 'transparent',
	orientation: 'horizontal'
})

settings.on('change', update)


// regenerate the data based on options
function update () {
	console.time('generate')
	let {traces, variables, points} = settings.values
	traces = parseInt(traces)
	variables = parseInt(variables)
	points = parseInt(points)

	if (traces < passes.length) {
		for (let i = traces; i < passes.length; i++) {
			passes[i] = null
		}
	}

	for (let i = 0; i < traces; i++) {
		let pass = (passes[i] || (passes[i] = {
			color: alpha(palette[i % palette.length], Math.random() * .5 + .25),
			size: 3,
			range: []
		}))

		if (!pass.data) pass.data = []
		if (pass.data.length > variables) pass.data.length = variables

		for (let col = 0; col < variables; col++) {
			if (!pass.data[col]) {
				pass.data[col] = []
				pass.data[col].mean = Math.random()
				pass.data[col].sdev = Math.random()
				pass.range[col] = passes[i-1] && passes[i-1].range[col] || [-5,5]
			}
			let colData = pass.data[col]
			let {mean, sdev} = colData
			if (colData.length > points) colData.length = points
			for (let j = colData.length; j < points; j++) {
				colData[j] = random() * sdev + mean
			}
		}
	}
	console.timeEnd('generate')

	console.time('update')
	splom.update(...passes)
	console.timeEnd('update')

	console.time('draw')
	splom.draw()
	console.timeEnd('draw')
}

update()


panzoom(splom.canvas, e => {
	let cnv = e.target

	let w = cnv.offsetWidth
	let h = cnv.offsetHeight

	let rx = e.x / w
	let ry = e.y / h

	// define affected ranges
	// recalc them
	// for every trace update affected ranges

	let rangePasses = passes.map(pass => {
		let ranges = pass.range
		let n = settings.values.variables

		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				let xrange = ranges[i][1] - ranges[i][0],
					yrange = ranges[j][1] - ranges[j][0]

				if (e.dz) {
					let dz = e.dz / w
					ranges[i][0] -= rx * xrange * dz
					ranges[i][1] += (1 - rx) * xrange * dz

					ranges[j][0] -= (1 - ry) * yrange * dz
					ranges[j][1] += ry * yrange * dz
				}

				ranges[i][0] -= xrange * e.dx / w
				ranges[i][1] -= xrange * e.dx / w
				ranges[j][0] += yrange * e.dy / h
				ranges[j][1] += yrange * e.dy / h
			}
		}


		return { ranges }
	})

	splom.render(...rangePasses)
})
