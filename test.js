'use strict'

const regl = require('regl')({ extensions: 'oes_element_index_uint'})
const scatter = require('regl-scatter2d')(regl)
const bounds = require('array-bounds')

const data = new Float32Array([0,.5,1,3, 4,5,6,7, 11,10,9,8])
const buffer = regl.buffer(data)

let w = regl._gl.drawingBufferWidth
let h = regl._gl.drawingBufferHeight
let n = 4
let m = 3
let iw = w / m
let ih = h / m
let passes = []
for (let i = 0; i < m; i++) {
	for (let j = 0; j < m; j++) {
		let xOffset = i * n
		let yOffset = j * n
		let [lox, hix] = bounds(data.subarray(xOffset, xOffset + n))
		let [loy, hiy] = bounds(data.subarray(yOffset, yOffset + n))

		passes.push({
			positions: {
				x: {buffer, offset: xOffset, count: n},
				y: {buffer, offset: yOffset, count: n}
			},
			bounds: [lox, loy, hix, hiy],
			viewport: [i * iw, j * ih, (i + 1) * iw, (j + 1) * ih]
		})
	}
}

scatter.update(passes)
scatter.draw()
