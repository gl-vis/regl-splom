# regl-scatter2d-matrix

Matrix of scatter plots (SPLOM). A wrapper over [regl-scatter2d](https://github.com/dfcreative/regl-scatter2d) for optimized intersected data rendering.

* [ ] minimal GPU memory footprint (N vs N*N direct [regl-scatter2d](https://github.com/dfcreative/regl-scatter2d) case)
* [ ] optimized performance due to binary trees for 1d point clustering, opposed to default 2d quad [point-clustering](https://github.com/dfcreative/point-cluster) in regl-scatter2d.


## Usage

[![npm install regl-scatter2d-matrix](https://nodei.co/npm/regl-scatter2d-matrix.png?mini=true)](https://npmjs.org/package/regl-scatter2d-matrix/)

```js
let regl = require('regl')({extensions: 'oes_element_index_uint'})

let createMatrix = require('regl-scatter2d-matrix')

let scatterMatrix = createMatrix(regl)

// pass data and views to display
scatterMatrix.update({
	data: [d1, d2, ...],
	view: [
		{ i, j, size, color, opacity, marker, range, viewport }
	]
})

// draw views by ids
scatterMatrix.draw(0, 1, ...views)
```

## Related

* [regl-scatter2d](https://github.com/dfcreative/regl-scatter2d)
* [regl-line2d](https://github.com/dfcreative/regl-line2d)
* [regl-error2d](https://github.com/dfcreative/regl-error2d)


## License

© 2018 Dmitry Yv. MIT License

Development supported by [plot.ly](https://github.com/plotly/).
