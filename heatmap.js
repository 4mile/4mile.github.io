(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["heatmap"] = factory();
	else
		root["heatmap"] = factory();
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
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _gridOptions = __webpack_require__(1);

var _gridOptions2 = _interopRequireDefault(_gridOptions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

looker.plugins.visualizations.add({
  options: {},

  create: function create(element) {
    this.vis = element.appendChild(document.createElement('div'));
    this.vis.id = 'heatmap-vis';
    // set the dimensions and margins of the graph
    var margin = { top: 30, right: 30, bottom: 30, left: 30 };
    this.width = 450 - margin.left - margin.right;
    this.height = 450 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    this.svg = d3.select('#heatmap-vis').append('svg').attr('width', this.width + margin.left + margin.right).attr('height', this.height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
  },
  updateAsync: function updateAsync(data, element, config, queryResponse, details, done) {
    this.clearErrors();

    var dims = queryResponse.fields.dimension_like;
    var meas = queryResponse.fields.measure_like;
    if (dims.length !== 2) {
      this.addError({
        message: 'This chart requires exactly 2 dimensions.',
        title: 'No Dimensions'
      });
      return;
    }

    if (meas.length !== 1) {
      this.addError({
        message: 'This chart requires exactly 1 measure.',
        title: 'No Measures'
      });
      return;
    }

    // Labels of row and columns
    var dim0Name = dims[0].name;
    var dim1Name = dims[1].name;
    var measName = meas[0].name;
    var xDims = data.map(function (d) {
      return d[dim0Name].value;
    });
    var yDims = data.map(function (d) {
      return d[dim1Name].value;
    });

    // Build X scales and axis:
    var x = d3.scaleBand().range([0, this.width]).domain(xDims).padding(0.01);
    this.svg.append('g').attr('transform', 'translate(0,' + this.height + ')').call(d3.axisBottom(x));

    // Build X scales and axis:
    var y = d3.scaleBand().range([this.height, 0]).domain(yDims).padding(0.01);
    this.svg.append('g').call(d3.axisLeft(y));

    // Build color scale
    var myColor = d3.scaleLinear().range(['white', '#69b3a2']).domain([1, 100]);

    var svg = this.svg;
    var foo = JSON.parse('[{"group":"A","variable":"v1","value":"30"},{"group":"A","variable":"v2","value":"95"},{"group":"A","variable":"v3","value":"22"},{"group":"A","variable":"v4","value":"14"},{"group":"A","variable":"v5","value":"59"},{"group":"A","variable":"v6","value":"52"},{"group":"A","variable":"v7","value":"88"},{"group":"A","variable":"v8","value":"20"},{"group":"A","variable":"v9","value":"99"},{"group":"A","variable":"v10","value":"66"},{"group":"B","variable":"v1","value":"37"},{"group":"B","variable":"v2","value":"50"},{"group":"B","variable":"v3","value":"81"},{"group":"B","variable":"v4","value":"79"},{"group":"B","variable":"v5","value":"84"},{"group":"B","variable":"v6","value":"91"},{"group":"B","variable":"v7","value":"82"},{"group":"B","variable":"v8","value":"89"},{"group":"B","variable":"v9","value":"6"},{"group":"B","variable":"v10","value":"67"},{"group":"C","variable":"v1","value":"96"},{"group":"C","variable":"v2","value":"13"},{"group":"C","variable":"v3","value":"98"},{"group":"C","variable":"v4","value":"10"},{"group":"C","variable":"v5","value":"86"},{"group":"C","variable":"v6","value":"23"},{"group":"C","variable":"v7","value":"74"},{"group":"C","variable":"v8","value":"47"},{"group":"C","variable":"v9","value":"73"},{"group":"C","variable":"v10","value":"40"},{"group":"D","variable":"v1","value":"75"},{"group":"D","variable":"v2","value":"18"},{"group":"D","variable":"v3","value":"92"},{"group":"D","variable":"v4","value":"43"},{"group":"D","variable":"v5","value":"16"},{"group":"D","variable":"v6","value":"27"},{"group":"D","variable":"v7","value":"76"},{"group":"D","variable":"v8","value":"24"},{"group":"D","variable":"v9","value":"1"},{"group":"D","variable":"v10","value":"87"},{"group":"E","variable":"v1","value":"44"},{"group":"E","variable":"v2","value":"29"},{"group":"E","variable":"v3","value":"58"},{"group":"E","variable":"v4","value":"55"},{"group":"E","variable":"v5","value":"65"},{"group":"E","variable":"v6","value":"56"},{"group":"E","variable":"v7","value":"9"},{"group":"E","variable":"v8","value":"78"},{"group":"E","variable":"v9","value":"49"},{"group":"E","variable":"v10","value":"36"},{"group":"F","variable":"v1","value":"35"},{"group":"F","variable":"v2","value":"80"},{"group":"F","variable":"v3","value":"8"},{"group":"F","variable":"v4","value":"46"},{"group":"F","variable":"v5","value":"48"},{"group":"F","variable":"v6","value":"100"},{"group":"F","variable":"v7","value":"17"},{"group":"F","variable":"v8","value":"41"},{"group":"F","variable":"v9","value":"33"},{"group":"F","variable":"v10","value":"11"},{"group":"G","variable":"v1","value":"77"},{"group":"G","variable":"v2","value":"62"},{"group":"G","variable":"v3","value":"94"},{"group":"G","variable":"v4","value":"15"},{"group":"G","variable":"v5","value":"69"},{"group":"G","variable":"v6","value":"63"},{"group":"G","variable":"v7","value":"61"},{"group":"G","variable":"v8","value":"54"},{"group":"G","variable":"v9","value":"38"},{"group":"G","variable":"v10","value":"93"},{"group":"H","variable":"v1","value":"39"},{"group":"H","variable":"v2","value":"26"},{"group":"H","variable":"v3","value":"90"},{"group":"H","variable":"v4","value":"83"},{"group":"H","variable":"v5","value":"31"},{"group":"H","variable":"v6","value":"2"},{"group":"H","variable":"v7","value":"51"},{"group":"H","variable":"v8","value":"28"},{"group":"H","variable":"v9","value":"42"},{"group":"H","variable":"v10","value":"7"},{"group":"I","variable":"v1","value":"5"},{"group":"I","variable":"v2","value":"60"},{"group":"I","variable":"v3","value":"21"},{"group":"I","variable":"v4","value":"25"},{"group":"I","variable":"v5","value":"3"},{"group":"I","variable":"v6","value":"70"},{"group":"I","variable":"v7","value":"34"},{"group":"I","variable":"v8","value":"68"},{"group":"I","variable":"v9","value":"57"},{"group":"I","variable":"v10","value":"32"},{"group":"J","variable":"v1","value":"19"},{"group":"J","variable":"v2","value":"85"},{"group":"J","variable":"v3","value":"53"},{"group":"J","variable":"v4","value":"45"},{"group":"J","variable":"v5","value":"71"},{"group":"J","variable":"v6","value":"64"},{"group":"J","variable":"v7","value":"4"},{"group":"J","variable":"v8","value":"12"},{"group":"J","variable":"v9","value":"97"},{"group":"J","variable":"v10","value":"72"}]');
    svg.selectAll().data(foo, function (d) {
      return d.group + ':' + d.variable;
    }).enter().append('rect').attr('x', function (d) {
      return x(d.group);
    }).attr('y', function (d) {
      return y(d.variable);
    }).attr('width', x.bandwidth()).attr('height', y.bandwidth()).style('fill', function (d) {
      return myColor(d.value);
    });

    done();
  }
});

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/***/ })
/******/ ]);
});