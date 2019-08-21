(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["custom_heatmap"] = factory();
	else
		root["custom_heatmap"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var DEFAULT_SCALE = exports.DEFAULT_SCALE = 25;
var LEFT_CONSTANT = exports.LEFT_CONSTANT = 7;
var MARGIN_BOTTOM = exports.MARGIN_BOTTOM = 0;
var TOP_CONSTANT = exports.TOP_CONSTANT = 6;

var ELEMENT_ID = exports.ELEMENT_ID = 'heatmap';
var NULL_VALUE = exports.NULL_VALUE = '___null';
var WHITE = exports.WHITE = '#FFFFFF';

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _options = __webpack_require__(2);

var _calcs = __webpack_require__(3);

var _constants = __webpack_require__(0);

/*
* This vis provides a heatmap using D3v4. It insists on 1 pivot, 1 dimension, and 1 measure.
* It has config options to change the max color, invert the colors, and set various
* margins and sizes (if left blank it chooses sensible defaults).
*
* In order to be able to dynamically resize, it doesn't set up the svg within create(),
* instead, it rerenders this in every updateAsync() call.
*/

looker.plugins.visualizations.add({
  options: _options.options,

  create: function create(element) {
    this.vis = document.createElement('div');
    this.vis.id = _constants.ELEMENT_ID;
    element.innerHTML = '\n      <style>\n        #heatmap {\n          margin: 0 auto;\n          width: fit-content;\n        }\n      </style>\n    ';
    element.appendChild(this.vis);
  },
  updateAsync: function updateAsync(data, element, config, queryResponse, details, done) {
    this.clearErrors();

    // Remove in order to rerender with varying sizes
    while (this.vis.firstChild) {
      this.vis.removeChild(this.vis.firstChild);
    } // set the dimensions and margins of the graph
    var margin = {
      top: (0, _calcs.calcMarginTop)(queryResponse, data, config),
      right: (0, _calcs.calcMarginRight)(queryResponse, data, config),
      bottom: (0, _calcs.calcMarginBottom)(queryResponse, data, config),
      left: (0, _calcs.calcMarginLeft)(queryResponse, data, config)
    };
    this.width = (0, _calcs.calcWidth)(queryResponse, data, config);
    this.height = (0, _calcs.calcHeight)(queryResponse, data, config);

    // append the svg object to the body of the page
    this.svg = d3.select('#' + _constants.ELEMENT_ID).append('svg').attr('width', this.width + margin.left + margin.right).attr('height', this.height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // 1 pivot, 1 dim, 1 measure
    var _queryResponse$fields = queryResponse.fields,
        dims = _queryResponse$fields.dimension_like,
        meas = _queryResponse$fields.measure_like,
        pivots = _queryResponse$fields.pivots;

    if (dims.length !== 1 && meas.length !== 1 && pivots.length !== 1) {
      this.addError({
        message: 'This chart requires exactly 1 pivot, 1 dimension, and 1 measure.',
        title: 'Incorrect Data'
      });
      return;
    }

    var pivotName = pivots[0].name;
    var dimName = dims[0].name;
    var measureName = meas[0].name;

    // Labels of row and columns
    var xDims = queryResponse.pivots.map(function (p) {
      return p.key;
    });
    var xDimLabels = xDims.map(function (x) {
      return x.includes(_constants.NULL_VALUE) ? '(null)' : x;
    });
    var yDims = data.map(function (d) {
      return d[dimName].value;
    }).reverse();

    // Build X scales and axis:
    var x = d3.scaleBand().range([0, this.width]).domain(xDimLabels).padding(0.01);
    this.svg.append('g').call(d3.axisTop(x).tickSize(0)).selectAll('text').attr('transform', 'rotate(-45)').style('text-anchor', 'start');

    // Build X scales and axis:
    var y = d3.scaleBand().range([this.height, 0]).domain(yDims).padding(0.01);
    this.svg.append('g').call(d3.axisLeft(y).tickSize(0));

    var min = 0;
    var max = 1;

    var formattedData = [];
    data.forEach(function (d) {
      xDims.forEach(function (pivotVal) {
        var newPt = {};
        newPt.x = pivotVal;
        newPt.y = d[dimName].value;
        var val = d[measureName][pivotVal].value;
        newPt.val = val;
        if (val < min) min = val;
        if (val > max) max = val;
        formattedData.push(newPt);
      });
    });

    var colorRange = [_constants.WHITE, config.max_color];
    if (config.invert_colors) colorRange.reverse();
    // Build color scale
    var myColor = d3.scaleLinear().range(colorRange).domain([min, max]);

    var svg = this.svg;
    svg.selectAll().data(formattedData, function (d) {
      return d.x + ':' + d.y;
    }).enter().append('rect').attr('x', function (d) {
      return x(d.x);
    }).attr('y', function (d) {
      return y(d.y);
    }).attr('width', x.bandwidth()).attr('height', y.bandwidth()).style('fill', function (d) {
      return myColor(d.val);
    });

    done();
  }
});

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var options = exports.options = {
  invert_colors: {
    default: false,
    label: 'Invert Colors',
    order: 2,
    section: 'Colors',
    type: 'boolean'
  },
  max_color: {
    default: '#000000',
    display: 'color',
    label: 'Max Color',
    order: 3,
    section: 'Colors',
    type: 'string'
  },

  width: {
    display_size: 'half',
    label: 'Width',
    order: 4,
    section: 'Sizing',
    type: 'number'
  },
  height: {
    display_size: 'half',
    label: 'Height',
    order: 5,
    section: 'Sizing',
    type: 'number'
  },
  scale: {
    default: 25,
    display_size: 'half',
    label: 'Default Cell Size (px)',
    order: 6,
    section: 'Sizing',
    type: 'number'
  },

  margin_left: {
    display_size: 'half',
    label: 'Margin Left',
    order: 8,
    section: 'Margins',
    type: 'number'
  },
  margin_right: {
    display_size: 'half',
    label: 'Margin Right',
    order: 9,
    section: 'Margins',
    type: 'number'
  },
  margin_top: {
    display_size: 'half',
    label: 'Margin Top',
    order: 10,
    section: 'Margins',
    type: 'number'
  },
  margin_bottom: {
    display_size: 'half',
    label: 'Margin Bottom',
    order: 11,
    section: 'Margins',
    type: 'number'
  }
};

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calcHeight = exports.calcWidth = exports.calcMarginBottom = exports.calcMarginLeft = exports.calcMarginRight = exports.calcMarginTop = undefined;

var _constants = __webpack_require__(0);

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var calcMarginTop = exports.calcMarginTop = function calcMarginTop(queryResponse, _data, config) {
  if (config.margin_top) return config.margin_top;
  return Math.max.apply(Math, _toConsumableArray(queryResponse.pivots.map(function (p) {
    return p.key.trim().length;
  }))) * _constants.TOP_CONSTANT;
};

var calcMarginRight = exports.calcMarginRight = function calcMarginRight(queryResponse, _data, config) {
  if (config.margin_right) return config.margin_right;
  return Math.max.apply(Math, _toConsumableArray(queryResponse.pivots.map(function (p) {
    return p.key.trim().length;
  }))) * _constants.TOP_CONSTANT;
};

var calcMarginLeft = exports.calcMarginLeft = function calcMarginLeft(queryResponse, data, config) {
  if (config.margin_left) return config.margin_left;
  return Math.max.apply(Math, _toConsumableArray(data.map(function (d) {
    return d[queryResponse.fields.dimension_like[0].name].value.length;
  }))) * _constants.LEFT_CONSTANT;
};

var calcMarginBottom = exports.calcMarginBottom = function calcMarginBottom(_queryResponse, _data, config) {
  if (config.margin_bottom) return config.margin_bottom;
  return _constants.MARGIN_BOTTOM;
};

var calcWidth = exports.calcWidth = function calcWidth(queryResponse, _data, config) {
  if (config.width) return config.width;
  return queryResponse.pivots.length * (config.scale || _constants.DEFAULT_SCALE);
};

var calcHeight = exports.calcHeight = function calcHeight(_queryResponse, data, config) {
  if (config.height) return config.height;
  return data.length * (config.scale || _constants.DEFAULT_SCALE);
};

/***/ })
/******/ ]);
});