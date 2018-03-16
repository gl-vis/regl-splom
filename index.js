'use strict'


const createScatter = require('../regl-scatter2d/scatter')
const flatten = require('flatten-vertex-data')
const pick = require('pick-by-alias')
const defined = require('defined')
const getBounds = require('array-bounds')
const raf = require('raf')
const lpad = require('left-pad')
const arrRange = require('array-range')
const rect = require('parse-rect')


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
	let passes = []
	let offset = 0
	for (let i = 0; i < this.traces.length; i++) {
		let trace = this.traces[i]
		let tracePasses = this.traces[i].passes
		for (let j = 0; j < tracePasses.length; j++) {
			passes.push(this.passes[tracePasses[j]])
		}
		// save offset of passes
		trace.passOffset = offset
		offset += trace.passes.length
	}

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

	let o = pick(options, {
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
		}),
		viewport:  rect([regl._gl.drawingBufferWidth, regl._gl.drawingBufferHeight])
	}))


	// save styles
	if (o.color != null) {
		trace.color = o.color
	}
	if (o.size != null) {
		trace.size = o.size
	}
	if (o.borderColor != null) {
		trace.borderColor = o.borderColor
	}
	if (o.borderSize != null) {
		trace.borderSize = o.borderSize
	}
	if (o.viewport) {
		trace.viewport = rect(o.viewport)
	}

	// put flattened data into buffer
	if (o.data) {
		trace.buffer(flatten(o.data))
		trace.columns = o.data.length
		trace.count = o.data[0].length

		// detect bounds per-column
		trace.bounds = []

		for (let i = 0; i < trace.columns; i++) {
			trace.bounds[i] = getBounds(o.data[i], 1)
		}

	}

	// add proper range updating markers
	let multirange
	if (o.range) {
		trace.range = o.range
		multirange = trace.range && typeof trace.range[0] !== 'number'
	}

	if (o.domain) {
		trace.domain = o.domain
	}


	// create passes
	let m = trace.columns
	let n = trace.count

	let w = trace.viewport.width
	let h = trace.viewport.height
	let iw = w / m
	let ih = h / m
	let pad = .0

	trace.passes = []

	for (let i = 0; i < m; i++) {
		for (let j = 0; j < m; j++) {
			let key = passId(trace.id, i, j)

			let pass = this.passes[key] || (this.passes[key] = {})

			if (o.data) {
				if (o.transpose) {
					pass.positions = {
						x: {buffer: trace.buffer, offset: i, count: n, stride: m},
						y: {buffer: trace.buffer, offset: j, count: n, stride: m}
					}
				}
				else {
					pass.positions = {
						x: {buffer: trace.buffer, offset: i * n, count: n},
						y: {buffer: trace.buffer, offset: j * n, count: n}
					}
				}

				pass.bounds = getBox(trace.bounds, i, j)
			}

			if (o.domain || o.viewport || o.data) {
				if (trace.domain) {
					let [lox, loy, hix, hiy] = getBox(trace.domain, i, j)
					pass.viewport = [lox * w, loy * h, hix * w, hiy * h]
				}
				// consider auto-domain equipartial
				else {
					pass.viewport = [j * iw + iw * pad, i * ih + ih * pad, (j + 1) * iw - iw * pad, (i + 1) * ih - ih * pad]
				}
			}

			if (o.color) pass.color = trace.color
			if (o.size) pass.size = trace.size
			if (o.borderSize) pass.borderSize = trace.borderSize
			if (o.borderColor) pass.borderColor = trace.borderColor

			if (o.range) {
				pass.range = multirange ? getBox(trace.range, i, j) : trace.range || pass.bounds
			}

			trace.passes.push(key)
		}
	}

	return this
}


// draw all or passed passes
SPLOM.prototype.draw = function (...args) {
	if (!args.length) {
		this.scatter.draw()
	}
	else {
		let idx = []
		for (let i = 0; i < args.length; i++) {
			let { passes, passOffset } = this.traces[args[i]]
			idx.push(...arrRange(passOffset, passOffset + passes.length))
		}
		this.scatter.draw(...idx)
	}

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
