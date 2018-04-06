const regl = require('regl')({ extensions: 'oes_element_index_uint' })
const createMatrix = require('../')

let splom = createMatrix(regl)

splom.update({
  data: [
    [0, 1, 2, 3, 4, 5, 10],
    [0, 1, 2, 3, 4, 5, 10],
    [0, 1, 2, 3, 4, 5, 10]
  ],
  ranges: [
    [0, 10],
    [0, 10],
    [0, 10]
  ],
  domain: [
    [0, 0, 0.333, 0.333],
    [0.3333, 0.3333, 0.66666, 0.66666],
    [0.66666, 0.66666, 1, 1]
  ],
  // domain: [
  //   [0, 0, 0.5, null],
  //   [0.5, 0, 1, 0.5],
  //   [null, 0.5, 1, 1]
  // ],
  adjustDomain: false,
  diagonal: false,
  lower: false
})

splom.draw()
