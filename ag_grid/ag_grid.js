/* eslint-disable arrow-body-style, no-undef, no-use-before-define */
// TODO
// (1) proper subtotaling for rendered columns.
//    -> Also truncate non-rendered to same # significant digits
//    -> Default to sum for user table calculations
// (2) header trunc bug
//    -> Something wrong with autoSize()
// (3) measure vs measure_like
// (4) custom cell rendering for last child (to remove ^ (1) )

/* Display-related constants and functions */

const autoSize = () => {
  gridOptions.columnApi.autoSizeAllColumns();
  const { gridPanel } = gridOptions.api;
  if (gridPanel.eBodyContainer.scrollWidth < gridPanel.eBody.scrollWidth) {
    gridOptions.api.sizeColumnsToFit();
  }
};

// Removes the current stylesheet in favor of user-selected theme in config.
const updateTheme = (classList, config) => {
  const currentClass = _.find(classList, klass => {
    const match = klass.match('ag-theme');
    if (match !== null) {
      return match.input;
    }
    return null;
  });
  if (currentClass !== null) {
    classList.remove(currentClass);
  }
  classList.add(config.theme);
};

// All of the currently supported ag-grid stylesheets.
const themes = [
  { Balham: 'ag-theme-balham' },
  { 'Balham Dark': 'ag-theme-balham-dark' },
  { Fresh: 'ag-theme-fresh' },
  { Dark: 'ag-theme-dark' },
  { Blue: 'ag-theme-blue' },
  { Material: 'ag-theme-material' },
  { Bootstrap: 'ag-theme-bootstrap' },
];

const defaultTheme = Object.values(themes[0])[0];

const addCSS = link => {
  const linkElement = document.createElement('link');

  linkElement.setAttribute('rel', 'stylesheet');
  linkElement.setAttribute('href', link);

  document.getElementsByTagName('head')[0].appendChild(linkElement);
};

// Load all ag-grid default style themes.
const loadStylesheets = () => {
  addCSS('https://unpkg.com/ag-grid-community/dist/styles/ag-grid.css');
  _.forEach(themes, theme => {
    addCSS(`https://unpkg.com/ag-grid-community/dist/styles/${Object.values(theme)[0]}.css`);
  });
};

/* User-defined cell renderers */

// The mere presence of this renderer is enough to actually render HTML.
const baseCellRenderer = obj => obj.value;

// Looker's table is 1-indexed.
const rowIndexRenderer = obj => obj.rowIndex + 1;

/* User-defined aggregation functions */

const aggFn = type => {
  if (type === 'average') {
    return avgAggFn;
  }
  return countAggFn;
};

const avgAggFn = values => {
  const total = _.reduce(values, (sum, n) => {
    return sum + n;
  }, 0);

  return total / values.length;
};

const countAggFn = values => {
  return _.reduce(values, (sum, n) => {
    return sum + parseInt(n, 10);
  }, 0);
};

/* User-defined grouped header class */

class PivotHeader {
  init(agParams) {
    this.agParams = agParams;
    this.eGui = document.createElement('div');
    this.eGui.innerHTML = this.agParams.displayName;
  }

  getGui() {
    return this.eGui;
  }

  destroy() {
    return null;
  }
}

// Take into account config prefs for truncation and brevity.
const headerName = (dimension, config) => {
  let label;
  if (config.showFullFieldName) {
    label = dimension.label; // eslint-disable-line
  } else {
    label = dimension.label_short || dimension.label;
  }

  // TODO requires a _little_ more finesse.
  if (config.truncateColumnNames && label.length > 15) {
    label = `${label.substring(0, 12)}...`;
  }

  return label;
};

const addRowNumbers = basics => {
  basics.unshift({
    cellRenderer: rowIndexRenderer,
    colType: 'row',
    headerName: '',
    lockPosition: true,
    maxWidth: '*',
    rowGroup: false,
    suppressMenu: true,
    suppressResize: true,
    suppressSizeToFit: true,
  });
};

// ag-grid doesn't approve of '.' in the field names we pass along.
const formatField = field => field.replace('.', '_');

// Base dimensions before table calcs, pivots, measures, etc added.
const basicDimensions = (dimensions, config) => {
  const basics = _.map(dimensions, dimension => {
    return {
      cellRenderer: baseCellRenderer,
      colType: 'default',
      field: formatField(dimension.name),
      headerName: headerName(dimension, config),
      hide: true,
      lookup: dimension.name,
      rowGroup: true,
    };
  });

  if (config.showRowNumbers) {
    addRowNumbers(basics);
  }

  return basics;
};

const addTableCalculations = (dimensions, tableCalcs) => {
  let dimension;
  _.forEach(tableCalcs, calc => {
    dimension = {
      colType: 'table_calculation',
      field: calc.name,
      headerName: calc.label,
      lookup: calc.name,
      rowGroup: true,
    };
    dimensions.push(dimension);
  });
};

const addMeasures = (dimensions, measures, config) => {
  let dimension;
  _.forEach(measures, measure => {
    // TODO
    // measure.type === 'average' => can indicate the correct agg fn.
    // something about measure.value_format?
    dimension = {
      aggFunc: aggFn(measure.type),
      colType: 'measure',
      enableValue: true,
      field: formatField(measure.name),
      headerName: headerName(measure, config),
      lookup: measure.name,
      measure: measure.name,
      rowGroup: false,
    };
    dimensions.push(dimension);
  });
};

// For every pivot there will be a column for all measures and table calcs.
const addPivots = (dimensions, queryResponse, config) => {
  let dimension;
  _.forEach(queryResponse.pivots, pivot => {
    const outerDimension = {
      children: [],
      colType: 'pivot',
      field: pivot.key,
      headerGroupComponent: PivotHeader,
      headerName: pivot.key,
      rowGroup: false,
    };

    const { measures, table_calculations: tableCalcs } = queryResponse.fields;
    const measureLike = _.concat(measures, tableCalcs);

    _.forEach(measureLike, measure => {
      dimension = {
        colType: 'pivotChild',
        columnGroupShow: 'open',
        field: formatField(`${pivot.key}_${measure.name}`),
        headerName: headerName(measure, config),
        measure: measure.name,
        pivotKey: pivot.key,
        rowGroup: false,
      };
      outerDimension.children.push(dimension);
    });

    dimensions.push(outerDimension);
  });
};

// Format the columns based on the queryResponse into an object ag-grid can handle.
const formatColumns = (queryResponse, config) => {
  const dimensions = basicDimensions(queryResponse.fields.dimensions, config);

  const { pivots, measures } = queryResponse.fields;
  const tableCalcs = queryResponse.fields.table_calculations;

  // Measures and table calcs are only shown in the context of pivots when present.
  if (!_.isEmpty(pivots)) {
    addPivots(dimensions, queryResponse, config);
  } else {
    // When there are no pivots, show measures and table calcs in own column.
    if (!_.isEmpty(measures)) {
      addMeasures(dimensions, measures, config);
    }
    if (!_.isEmpty(tableCalcs)) {
      addTableCalculations(dimensions, tableCalcs);
    }
  }

  return dimensions;
};

// Attempt to display in this order: HTML -> rendered -> value
const displayData = data => {
  if (_.isEmpty(data)) { return; }
  let formattedData;
  if (data.html) {
    // XXX This seems to be a diff func than table. OK?
    formattedData = LookerCharts.Utils.htmlForCell(data);
  } else {
    formattedData = LookerCharts.Utils.textForCell(data);
  }

  return formattedData;
};

const formatData = (data, colDefs) => {
  return _.map(data, datum => {
    const formattedDatum = {};

    _.forEach(colDefs, col => {
      if (col.colType === 'row') { return; }

      if (col.colType === 'pivot') {
        _.forEach(col.children, child => {
          formattedDatum[child.field] = displayData(datum[child.measure][child.pivotKey]);
        });
      } else {
        formattedDatum[col.field] = displayData(datum[col.lookup]);
      }
    });

    return formattedDatum;
  });
};

const gridOptions = {
  animateRows: true,
  columnDefs: [],
  enableFilter: false,
  enableSorting: false,
  groupDefaultExpanded: -1,
  groupHideOpenParents: true,
  groupMultiAutoColumn: true,
  groupSelectsChildren: true,
  onFirstDataRendered: autoSize,
  onRowGroupOpened: autoSize,
  rowSelection: 'multiple',
  suppressAggFuncInHeader: true,
};

looker.plugins.visualizations.add({
  options: {
    showFullFieldName: {
      default: false,
      label: 'Show Full Field Name',
      order: 2,
      section: 'Series',
      type: 'boolean',
    },
    showRowNumbers: {
      default: true,
      label: 'Show Row Numbers',
      order: 2,
      section: 'Plot',
      type: 'boolean',
    },
    theme: {
      default: defaultTheme,
      display: 'select',
      label: 'Table Theme',
      order: 1,
      section: 'Plot',
      type: 'string',
      values: themes,
    },
    truncateColumnNames: {
      default: false,
      label: 'Truncate Column Names',
      order: 1,
      section: 'Series',
      type: 'boolean',
    },
  },

  create(element, config) {
    loadStylesheets();

    element.innerHTML = `
      <style>
        .ag-grid-vis {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
      </style>
    `;

    // Create an element to contain the grid.
    this.grid = element.appendChild(document.createElement('div'));
    this.grid.className = 'ag-grid-vis';

    this.grid.classList.add(defaultTheme);
    new agGrid.Grid(this.grid, gridOptions); // eslint-disable-line
  },

  updateAsync(data, element, config, queryResponse, details, done) {
    this.clearErrors();

    const { fields } = queryResponse;
    if (fields.dimensions.length === 0) {
      this.addError({ title: 'No Dimensions', message: 'This chart requires dimensions.' });
      return;
    }

    if (!_.isEmpty(fields.pivots) &&
         (_.isEmpty(fields.measures) && _.isEmpty(fields.table_calculations))) {
      this.addError({ title: 'Empty Pivot(s)', message: 'Add a measure or table calculation to pivot on.' });
      return;
    }

    updateTheme(this.grid.classList, config);

    // Manipulates Looker's queryResponse into a format suitable for ag-grid.
    const colDefs = formatColumns(queryResponse, config);
    gridOptions.api.setColumnDefs(colDefs);

    // Manipulates Looker's data response into a format suitable for ag-grid.
    const formattedData = formatData(data, colDefs);
    gridOptions.api.setRowData(formattedData);

    autoSize();
    done();
  },
});
