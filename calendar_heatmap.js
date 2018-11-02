function calendarHeatmap() {
  // defaults
  var width = 850;
  var height = 140;
  var legendWidth = 200;
  var selector = 'body';
  var SQUARE_LENGTH = 14;
  var SQUARE_PADDING = 2;
  var MONTH_LABEL_PADDING = 6;
  var now = moment().endOf('day').toDate();
  var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
  var startDate = null;
  var counterMap= {};
  var data = [];
  var max = null;
  var colorRange = [];
  var tooltipEnabled = true;
  var tooltipUnit = '';
  var legendEnabled = true;
  var onClick = null;
  var weekStart = 0; //0 for Sunday, 1 for Monday
  var locale = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    No: 'Null',
    on: 'on',
    Less: 'Less',
    More: 'More'
  };
  var v = Number(d3.version.split('.')[0]);

  // setters and getters
  chart.data = function (value) {
    if (!arguments.length) { return data; }
    data = value;

    counterMap= {};

    data.forEach(function (element, index) {
        var key= moment(element.date).format( 'YYYY-MM-DD' );
        var counter= counterMap[key] || 0;
        counterMap[key]= counter + element.count;
    });

    return chart;
  };

  chart.max = function (value) {
    if (!arguments.length) { return max; }
    max = value;
    return chart;
  };

  chart.selector = function (value) {
    if (!arguments.length) { return selector; }
    selector = value;
    return chart;
  };

  chart.startDate = function (value) {
    if (!arguments.length) { return startDate; }
    yearAgo = value;
    now = moment(value).endOf('day').add(1, 'year').toDate();
    return chart;
  };

  chart.colorRange = function (value) {
    if (!arguments.length) { return colorRange; }
    colorRange = value;
    return chart;
  };

  chart.tooltipEnabled = function (value) {
    if (!arguments.length) { return tooltipEnabled; }
    tooltipEnabled = value;
    return chart;
  };

  chart.tooltipUnit = function (value) {
    if (!arguments.length) { return tooltipUnit; }
    tooltipUnit = value;
    return chart;
  };

  chart.legendEnabled = function (value) {
    if (!arguments.length) { return legendEnabled; }
    legendEnabled = value;
    return chart;
  };

  chart.onClick = function (value) {
    if (!arguments.length) { return onClick(); }
    onClick = value;
    return chart;
  };

  chart.locale = function (value) {
    if (!arguments.length) { return locale; }
    locale = value;
    return chart;
  };

  function chart() {

    d3.select(chart.selector()).selectAll('svg.calendar-heatmap').remove(); // remove the existing chart, if it exists

    var dateRange = ((d3.time && d3.time.days) || d3.timeDays)(yearAgo, now); // generates an array of date objects within the specified range
    var monthRange = ((d3.time && d3.time.months) || d3.timeMonths)(moment(yearAgo).startOf('month').toDate(), now); // it ignores the first month if the 1st date is after the start of the month
    var firstDate = moment(dateRange[0]);
    if (chart.data().length == 0) {
      max = 0;
      min = 0;
    } else if (max === null) {
      max = d3.max(chart.data(), function (d) { return d.count; }); // max data value
      min = d3.min(chart.data(), function (d) { return d.count; }); // max data value
      // console.log(min,max)
    }

    // color range
    var color = ((d3.scale && d3.scale.linear) || d3.scaleLinear)()
      .range(chart.colorRange())
      .domain([min, max]);

    var tooltip;
    var dayRects;

    drawChart();

    function drawChart() {
      var svg = d3.select(chart.selector())
        .style('position', 'relative')
        .append('svg')
        .attr('width', width)
        .attr('class', 'calendar-heatmap')
        .attr('height', height)
        .style('padding', '36px');

      dayRects = svg.selectAll('.day-cell')
        .data(dateRange);  //  array of days for the last yr

      var enterSelection = dayRects.enter().append('rect')
        .attr('class', 'day-cell')
        .attr('width', SQUARE_LENGTH)
        .attr('height', SQUARE_LENGTH)
        .attr('fill', function(d) { return color(countForDate(d)); })
        .attr('x', function (d, i) {
          var cellDate = moment(d);
          var result = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
          return result * (SQUARE_LENGTH + SQUARE_PADDING);
        })
        .attr('y', function (d, i) {
          return MONTH_LABEL_PADDING + formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING);
        });

      if (typeof onClick === 'function') {
        (v === 3 ? enterSelection : enterSelection.merge(dayRects)).on('click', function(d) {
          var count = countForDate(d);
          onClick({ date: d, count: count});
        });
      }

      if (chart.tooltipEnabled()) {
        (v === 3 ? enterSelection : enterSelection.merge(dayRects)).on('mouseover', function(d, i) {
          tooltip = d3.select(chart.selector())
            .append('div')
            .attr('class', 'day-cell-tooltip')
            .html(tooltipHTMLForDate(d))
            .style('left', function () { return Math.floor(i / 7) * SQUARE_LENGTH + 'px'; })
            .style('top', function () {
              return formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING) + MONTH_LABEL_PADDING * 2 + 'px';
            });
        })
        .on('mouseout', function (d, i) {
          tooltip.remove();
        });
      }

      if (chart.legendEnabled()) {
        var colorRange = [];
        for (var i = 1; i < 5; i++) {
          colorRange.push(color(max - (max - min) / i));
        }
        colorRange.push(color(max));



        var legendGroup = svg.append('g');
        legendGroup.selectAll('.calendar-heatmap-legend')
            .data(colorRange)
            .enter()
          .append('rect')
            .attr('class', 'calendar-heatmap-legend')
            .attr('width', SQUARE_LENGTH)
            .attr('height', SQUARE_LENGTH)
            .attr('x', function (d, i) { return (width - legendWidth) + (i + 1) * 15; })
            .attr('y', height + SQUARE_PADDING)
            .attr('fill', function (d) { return d; });

        var lessTextLength = 2;
        if (locale.Less) {
          lessTextLength = locale.Less.toString().length * 4;
        } 

        legendGroup.append('text')
          .attr('class', 'calendar-heatmap-legend-text calendar-heatmap-legend-text-less')
          .attr('x', width - legendWidth - lessTextLength)
          .attr('y', height + SQUARE_LENGTH)
          .text(locale.Less);

        legendGroup.append('text')
          .attr('class', 'calendar-heatmap-legend-text calendar-heatmap-legend-text-more')
          .attr('x', (width - legendWidth + SQUARE_PADDING) + (colorRange.length + 1) * 15)
          .attr('y', height + SQUARE_LENGTH)
          .text(locale.More);
      }

      dayRects.exit().remove();
      var monthLabels = svg.selectAll('.month')
          .data(monthRange)
          .enter().append('text')
          .attr('class', 'month-name')
          .text(function (d) {
            return locale.months[d.getMonth()];
          })
          .attr('x', function (d, i) {
            var matchIndex = 0;
            dateRange.find(function (element, index) {
              matchIndex = index;
              return moment(d).isSame(element, 'month') && moment(d).isSame(element, 'year');
            });

            return Math.floor(matchIndex / 7) * (SQUARE_LENGTH + SQUARE_PADDING);
          })
          .attr('y', 0);  // fix these to the top

      locale.days.forEach(function (day, index) {
        index = formatWeekday(index);
        if (index % 2) {
          svg.append('text')
            .attr('class', 'day-initial')
            .attr('transform', 'translate(-8,' + (SQUARE_LENGTH + SQUARE_PADDING) * (index + 1) + ')')
            .style('text-anchor', 'middle')
            .attr('dy', '2')
            .text(day);
        }
      });
    }

    function pluralizedTooltipUnit (count) {
      if ('string' === typeof tooltipUnit) {
        return (tooltipUnit + (count === 1 ? '' : ''));
      }
      for (var i in tooltipUnit) {
        var _rule = tooltipUnit[i];
        var _min = _rule.min;
        var _max = _rule.max || _rule.min;
        _max = _max === 'Infinity' ? Infinity : _max;
        if (count >= _min && count <= _max) {
          return _rule.unit;
        }
      }
    }

    function tooltipHTMLForDate(d) {
      var dateStr = moment(d).format('ddd, MMM Do YYYY');
      var count = countForDate(d);
      return '<span><strong>' + (count ? count : locale.No) + ' ' + pluralizedTooltipUnit(count) + '</strong> ' + locale.on + ' ' + dateStr + '</span>';
    }

    function countForDate(d) {
        var key= moment(d).format( 'YYYY-MM-DD' );
        return counterMap[key] // || 0;
    }

    function formatWeekday(weekDay) {
      if (weekStart === 1) {
        if (weekDay === 0) {
          return 6;
        } else {
          return weekDay - 1;
        }
      }
      return weekDay;
    }

    var daysOfChart = chart.data().map(function (day) {
      return day.date.toDateString();
    });

  }

  return chart;
  }


  // polyfill for Array.find() method
  /* jshint ignore:start */
  if (!Array.prototype.find) {
  Array.prototype.find = function (predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}
    /* jshint ignore:end */

looker.plugins.visualizations.add({
  id: "calendar-heatmap",
  label: "Calendar Heatmap",
  options: {
    colorMin: {
      label: 'Color Min',
      default: '#D8E6E7',
      type: 'string',
      display: 'color',
      display_size: "half",
      order: 1
    },
    colorMax: {
      type: "string",
      label: "Color Max",
      display: "color",
      default: "#218380",
      display_size: "half",
      order: 2
    },
    textMinMaxToggle: {
      type: "string",
      label: "Select Text or Min/Max Value for Legend",
      display: "radio",
      default: "Text",
      values: [
        {"Min/Max Values": "Min/Max Values"},
        {"Text": "Text"}
      ],
      order: 3
    },
    lessText: {
      type: "string",
      label: "Legend min label",
      default: "Less",
      hidden: function(config, queryResponse) {
        return config.textMinMaxToggle === "Min/Max Values";
      },
      order: 4
    },
    moreText: {
      type: "string",
      label: "Legend max label",
      default: "More",
      hidden: function(config, queryResponse) {
        return config.textMinMaxToggle === "Min/Max Values";
      },
      order: 5
    },
  },
  create: function(element, config) {
     var css = element.innerHTML = `
      <style>
        .container {
          display: flex;
          justify-content: center;
        }
        text.month-name,
        text.calendar-heatmap-legend-text,
        text.day-initial {
          font-size: 10px;
          fill: inherit;
          font-family: Helvetica, arial, 'Open Sans', sans-serif;
        }
        rect.day-cell:hover {
          stroke: #555555;
          stroke-width: 1px;
        }
        .day-cell-tooltip {
          position: absolute;
          z-index: 9999;
          padding: 5px 9px;
          color: #bbbbbb;
          font-size: 12px;
          background: rgba(0, 0, 0, 0.85);
          border-radius: 3px;
          text-align: center;
        }
        .day-cell-tooltip > span {
          font-family: Helvetica, arial, 'Open Sans', sans-serif
        }
        .calendar-heatmap {
          box-sizing: initial;
          overflow: inherit;
        }
      </style>
    `;

     var container = element.appendChild(document.createElement("div"));
      container.className = "container";

    // lookup the container we want the Grid to use
    var eGridDiv = document.querySelector('#myGrid');
  },
  updateAsync: function(data, element, config, queryResponse, details, done) {

    var now = moment().endOf('day').toDate();
    var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
    var chartData = d3.timeDays(yearAgo, now).map(function (dateElement) {
      return {
        date: dateElement,
        count: (dateElement.getDay() !== 0 && dateElement.getDay() !== 6) ? Math.floor(Math.random() * 60) : Math.floor(Math.random() * 10)
      };
    });
    
    
    var dimension_name = queryResponse.fields.dimensions[0].name
    var tablecalc_name = queryResponse.fields.table_calculations[0].name

    var data_m = _.map(data, function(value, key) {
      var obj = {};
      var newRow = _.map(value, function(objectValue, objectKey){
        // var new_name = objectKey.split(".");
        if (objectKey == dimension_name) {
          obj["date"] = moment(objectValue.value,'YYYY-MM-DD').toDate();
        } else if (objectKey == tablecalc_name) {
          obj["count"] = objectValue.value.toString()  && Math.floor(objectValue.value * 100) / 100;
        }
      });
      return obj;
    });

    data_m = _.sortBy(data_m, 'date');
    
    var data_min_max = _.sortBy(data, function(o){ return o[tablecalc_name].value});
    // console.log('data_min_max',data_min_max)
    var data_minimum = data_min_max[0][tablecalc_name].rendered;
    var data_maximum = data_min_max.slice(-1)[0][tablecalc_name].rendered;

    less_min = function(value) {
      if (value == "Text") {
        return config.lessText;
      } else if (value == "Min/Max Values") {
        return data_minimum;
      }
    };

    more_max = function(value) {
      if (value == "Text") {
        return config.moreText;
      } else if (value == "Min/Max Values") {
        return data_maximum;
      }
    };

    var heatmap = calendarHeatmap()
      .data(data_m)
      .selector('.container')
      .tooltipEnabled(true)
       // .colorRange([config.,'#218380'])
      .colorRange([config.colorMin,config.colorMax])
      .startDate(data_m[0].date)
      .locale({
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        No: 'Null',
        on: 'on',
        Less: less_min(config.textMinMaxToggle),
        More: more_max(config.textMinMaxToggle)
      });
    heatmap();  // render the chart
    done()

  }
})