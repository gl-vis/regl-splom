# regl-scattermatrix

Matrix of scatter plots (SPLOM). A wrapper over [regl-scatter2d](https://github.com/dfcreative/regl-scatter2d) for optimized intersected data rendering.

* [x] minimal GPU memory footprint: N vs N*N in direct [regl-scatter2d](https://github.com/dfcreative/regl-scatter2d) case.
* [ ] optimized performance due to binary trees for 1d point clustering, opposed to default 2d quad clustering.


## Usage

[![npm install regl-scattermatrix](https://nodei.co/npm/regl-scattermatrix.png?mini=true)](https://npmjs.org/package/regl-scattermatrix/)

```js
let regl = require('regl')({extensions: 'oes_element_index_uint'})
let createMatrix = require('regl-scattermatrix')

let scatterMatrix = createMatrix(regl)

// pass data and views to display
scatterMatrix.update(
	{ data: [[], [], ...], ranges, domains, viewport, size, color, border },
	{ data: [[], [], ...], ranges, domains, viewport, size, color, border }
)

// draw views by ids
scatterMatrix.draw(0, 1, ...views)
```

## API

### `splom = createSplom(regl)`

### `splom.update(optionsA, optionsB, ...passes)`

Define passes for `draw` method. Every options can include

Option | Description
---|---
`data` | An array with arrays for the columns.
`ranges` | Array with data ranges corresponding to `data`. Detected automatically.
`domains` | Array with domain ranges `[from, to]` from the `0..1` interval, defining what area of the viewport a dimension holds.
`color`, `size`, `borderColor`, `borderSize` | Points style
`viewport` | Area that the plot holds within the canvas

### `splom.draw(...ids?)`

Draw all defined passes, or only selected ones provided by ids.

### `splom.destroy()`

Dispose renderer and all the associated resources

## Related

* [regl-scatter2d](https://github.com/dfcreative/regl-scatter2d)
* [regl-line2d](https://github.com/dfcreative/regl-line2d)
* [regl-error2d](https://github.com/dfcreative/regl-error2d)


## License

© 2018 Dmitry Yv. MIT License

Development supported by [plot.ly](https://github.com/plotly/).
