'use strict'


const createScatter = require('../regl-scatter2d/scatter')
const flatten = require('flatten-vertex-data')
const pick = require('pick-by-alias')
const defined = require('defined')


module.exports = SPLOM


function SPLOM (regl, options) {
	if (!(this instanceof SPLOM)) return new SPLOM(regl, options)

	// render passes
	this.traces = []

	// passes for scatter, combined across traces
	this.passes = {}

	this.regl = regl

	// main scatter drawing instance
	this.scatter = createScatter(regl)
}


SPLOM.prototype.update = function (options) {
	if (!arguments.length) return

	for (let i = 0; i < arguments.length; i++) {
		this.updateItem(i, arguments[i])
	}

	// FIXME: convert scattergl to multibuffer and update passes independently
	let passes = Object.keys(this.passes).sort().map((key, i) => {
		this.passes[key].index = i
		return this.passes[key]
	});

	this.scatter.update(...passes)

	return this
}


SPLOM.prototype.updateItem = function (i, options) {
	let { regl } = this

	let { data, snap, size, color, opacity, borderSize, borderColor, marker, range, viewport, domain, transpose } = pick(options, {
		data: 'data items columns rows values dimensions samples',
		snap: 'snap cluster',
		size: 'sizes size radius',
		color: 'colors color fill fill-color fillColor',
		opacity: 'opacity alpha transparency opaque',
		borderSize: 'borderSizes borderSize border-size bordersize borderWidth borderWidths border-width borderwidth stroke-width strokeWidth strokewidth outline',
		borderColor: 'borderColors borderColor bordercolor stroke stroke-color strokeColor',
		marker: 'markers marker shape',
		range: 'range ranges databox dataBox',
		viewport: 'viewport viewBox viewbox',
		domain: 'domain domains areas',
		transpose: 'transpose transposed'
	})

	// we provide regl buffer per-trace, since trace data can be changed
	let trace = (this.traces[i] || (this.traces[i] = {
		id: i,
		buffer: regl.buffer({
			usage: 'dynamic',
			type: 'float',
			data: null
		})
	}))

	// put flattened data into buffer
	if (defined(data)) {
		trace.buffer(flatten(data))
		trace.columns = data.length
	}

	// create passes
	let m = trace.columns
	let n = data[0].length

	let w = regl._gl.drawingBufferWidth
	let h = regl._gl.drawingBufferHeight
	let iw = w / m
	let ih = h / m
	let pad = .001


	for (let i = 0, ptr = 0; i < m; i++) {
		for (let j = 0; j < m; j++) {
			let key = passId(trace.id, i, j)
			this.passes[key] = {
				positions: {
					// planar
					x: {buffer: trace.buffer, offset: i * n, count: n},
					y: {buffer: trace.buffer, offset: j * n, count: n}

					// transposed
					// x: {buffer: trace.buffer, offset: i, count: n, stride: m},
					// y: {buffer: trace.buffer, offset: j, count: n, stride: m}
				},
				color: 'red',
				borderSize: 0,
				size: 2,
				bounds: [-3, -3, 3, 3],
				viewport: [i * iw + iw * pad, j * ih + ih * pad, (i + 1) * iw - iw * pad, (j + 1) * ih - ih * pad]
			}
		}
	}

	return this
}


SPLOM.prototype.draw = function () {
	for (let i = 0; i < this.traces.length; i++) {
		this.drawItem(i)
	}

	return this
}

// draw single pass
SPLOM.prototype.drawItem = function (i) {
	let { columns, id } = this.traces[i]

	let idx = []

	for (let i = 0; i < columns; i++) {
		for (let j = 0; j < columns; j++) {
			idx.push(this.passes[passId(id, i, j)].index)
		}
	}

	this.scatter.draw(...idx)

	return this
}

//
SPLOM.prototype.destroy = function () {
	this.buffer.dispose()
	this.scatter.destroy()

	return this
}

// return pass corresponding to trace i- j- square
function passId (trace, i, j) {
	let id = (trace.id != null ? trace.id : trace)
	let n = i
	let m = j
	return parseInt(`${id.toString(16)}${n.toString(16)}0${m.toString(16)}`, 16)
}
