'use strict'


const createScatter = require('../regl-scatter2d/scatter')
const flatten = require('flatten-vertex-data')
const pick = require('pick-by-alias')
const defined = require('defined')
const getBounds = require('array-bounds')
const raf = require('raf')
const lpad = require('left-pad')


module.exports = SPLOM


// @constructor
function SPLOM (regl, options) {
	if (!(this instanceof SPLOM)) return new SPLOM(regl, options)

	// render passes
	this.traces = []

	// passes for scatter, combined across traces
	this.passes = {}

	this.regl = regl

	// main scatter drawing instance
	this.scatter = createScatter(regl)

	this.canvas = this.scatter.canvas
}

// update & draw passes once per frame
SPLOM.prototype.render = function (...args) {
	if (args.length) {
		this.update(...args)
	}

	if (this.regl.attributes.preserveDrawingBuffer) return this.draw()

	// make sure draw is not called more often than once a frame
	if (this.dirty) {
		if (this.planned == null) {
			this.planned = raf(() => {
				this.draw()
				this.dirty = true
				this.planned = null
			})
		}
	}
	else {
		this.draw()
		this.dirty = true
		raf(() => {
			this.dirty = false
		})
	}

	return this
}


// update passes
SPLOM.prototype.update = function (...args) {
	if (!args.length) return

	for (let i = 0; i < args.length; i++) {
		this.updateItem(i, args[i])
	}

	// remove nulled passes
	this.traces = this.traces.filter(Boolean)

	// FIXME: convert scattergl to buffer-per-pass maybe and update passes independently
	let passes = Object.keys(this.passes).sort().map((key, i) => {
		this.passes[key].index = i
		return this.passes[key]
	});

	this.scatter.update(...passes)

	return this
}


// update trace by index, not supposed to be called directly
SPLOM.prototype.updateItem = function (i, options) {
	let { regl } = this

	// remove pass if null
	if (options === null) {
		this.traces[i] = null
		return this
	}

	if (!options) return this

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
			data: null,
			color: 'black',
			size: 12,
			borderColor: 'transparent',
			borderSize: 1
		})
	}))

	// range/viewport
	let multirange = range && typeof range[0] !== 'number'
	trace.range = range

	// save styles
	if (defined(color)) {
		trace.color = color
	}
	if (defined(size)) {
		trace.size = size
	}
	if (defined(borderColor)) {
		trace.borderColor = borderColor
	}
	if (defined(borderSize)) {
		trace.borderSize = borderSize
	}

	// put flattened data into buffer
	if (defined(data)) {
		trace.buffer(flatten(data))
		trace.columns = data.length
		trace.count = data[0].length

		// detect bounds per-column
		trace.bounds = []

		for (let i = 0; i < data.length; i++) {
			trace.bounds[i] = getBounds(data[i], 1)
		}
	}

	// create passes
	let m = trace.columns
	let n = trace.count

	let w = regl._gl.drawingBufferWidth
	let h = regl._gl.drawingBufferHeight
	let iw = w / m
	let ih = h / m
	let pad = .0

	for (let i = 0; i < m; i++) {
		for (let j = 0; j < m; j++) {
			let key = passId(trace.id, i, j)

			let bounds = getBox(trace.bounds, i, j)
			let range = multirange ? getBox(trace.range, i, j) : trace.range || bounds

			this.passes[key] = {
				positions: {
					// planar
					x: {buffer: trace.buffer, offset: i * n, count: n},
					y: {buffer: trace.buffer, offset: j * n, count: n}

					// transposed
					// x: {buffer: trace.buffer, offset: i, count: n, stride: m},
					// y: {buffer: trace.buffer, offset: j, count: n, stride: m}
				},
				color: trace.color,
				size: trace.size,
				borderSize: trace.borderSize,
				borderColor: trace.borderColor,
				bounds,
				range,
				viewport: [j * iw + iw * pad, i * ih + ih * pad, (j + 1) * iw - iw * pad, (i + 1) * ih - ih * pad]
			}
		}
	}

	return this
}


// draw all or passed passes
SPLOM.prototype.draw = function (...args) {
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
	let key = id << 16 | (n & 0xff) << 8 | m & 0xff

	return key
}


// return bounding box corresponding to a pass
function getBox (ranges, i, j) {
	let ilox, iloy, ihix, ihiy, jlox, jloy, jhix, jhiy
	let irange = ranges[i], jrange = ranges[j]

	if (irange.length > 2) {
		ilox = irange[0]
		ihix = irange[2]
		iloy = irange[1]
		ihiy = irange[3]
	}
	else {
		ilox = iloy = irange[0]
		ihix = ihiy = irange[1]
	}

	if (jrange.length > 2) {
		jlox = jrange[0]
		jhix = jrange[2]
		jloy = jrange[1]
		jhiy = jrange[3]
	}
	else {
		jlox = jloy = jrange[0]
		jhix = jhiy = jrange[1]
	}

	return [ jlox, iloy, jhix, ihiy ]
}
