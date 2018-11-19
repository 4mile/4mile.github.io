/* eslint-disable arrow-body-style, no-undef, no-use-before-define */

const setColumns = () => {
  gridOptions.api.setColumnDefs(globalConfig.formattedColumns);
};

const adjustFonts = () => {
  const { config } = globalConfig;

  if ('fontFamily' in config) {
    const theme = config.theme;
    const mainDiv = document.getElementById('ag-grid-vis');
    mainDiv.style.fontFamily = config.fontFamily;
  }

  // TODO: Fix the header font resizing (keeping header text centered properly).
  if ('fontSize' in config) {
    // const agHeaderRows = document.getElementsByClassName('ag-header-row');
    // _.forEach(agHeaderRows, row => row.style.fontSize = `${config.fontSize}px`);
    const agRows = document.getElementsByClassName('ag-row');
    _.forEach(agRows, row => row.style.fontSize = `${config.fontSize}px`);
    // const agHeaderCells = document.getElementsByClassName('ag-header-cell');
    // _.forEach(agHeaderCells, cell => {
    //   // TODO: flex was not working here, this is a hack.
    //   cell.style.paddingTop = `${(config.fontSize - 14)}px`;
    // });
    const agCells = document.getElementsByClassName('ag-cell');
    _.forEach(agCells, cell => {
      cell.style.display = 'flex';
      cell.style.flexDirection = 'column';
      cell.style.justifyContent = 'center';
    });
    // const headerHeight = config.fontSize * 2 + 1;
    // gridOptions.api.setHeaderHeight(headerHeight);
  }

  if ('rowHeight' in config) {
    gridOptions.rowHeight = config.rowHeight;
    // gridOptions.api.resetRowHeights();
  }
};

class AgColumn {
  constructor(config) {
    this.config = config;
    this.formatColumns();
  }

  // Format the columns based on the queryResponse into an object ag-grid can handle.
  formatColumns() {
    const { queryResponse } = globalConfig;
    const { pivots, measures, dimensions: dims } = queryResponse.fields;
    const dimensions = basicDimensions(dims, this.config);

    const tableCalcs = queryResponse.fields.table_calculations;

    // Measures and table calcs are only shown in the context of pivots when present.
    if (!_.isEmpty(pivots)) {
      addPivots(dimensions, this.config);
    } else {
      // When there are no pivots, show measures and table calcs in own column.
      if (!_.isEmpty(measures)) {
        addMeasures(dimensions, measures, this.config);
      }
      if (!_.isEmpty(tableCalcs)) {
        addTableCalculations(dimensions, tableCalcs);
      }
    }

    this.formattedColumns = dimensions;
  }
}

class AgData {
  constructor(data, formattedColumns) {
    this.data = data;
    this.formattedColumns = formattedColumns;
    this.formatData();
  }

  formatData() {
    this.formattedData = this.data.map(datum => {
      const formattedDatum = {};

      this.formattedColumns.forEach(col => {
        const {
          children, colType, field: colField, lookup,
        } = col;
        if (colType === 'row') { return; }

        if (colType === 'pivot') {
          children.forEach(child => {
            formattedDatum[child.field] = displayData(datum[child.measure][child.pivotKey]);
          });
        } else {
          formattedDatum[colField] = displayData(datum[lookup]);
        }
      });

      return formattedDatum;
    });
  }
}

class GlobalConfig {
  constructor() {
    this.selectedFields = [];
  }

  addSelectedField(field) {
    if (this.selectedFields.indexOf(field) === -1) {
      this.selectedFields.push(field);
    }
  }

  removeSelectedField(field) {
    this.selectedFields = this.selectedFields.filter(selectedField => {
      return selectedField !== field;
    });
  }
}

const globalConfig = new GlobalConfig();

//
// Display-related constants and functions
//

const autoSize = () => {
  gridOptions.columnApi.autoSizeAllColumns();
  const { gridPanel } = gridOptions.api;
  if (gridPanel.eBodyContainer.scrollWidth < gridPanel.eBody.scrollWidth) {
    gridOptions.api.sizeColumnsToFit();
  }
};

// Removes the current stylesheet in favor of user-selected theme in config.
const updateTheme = (classList, theme) => {
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
  classList.add(theme);
};

// All of the currently supported ag-grid stylesheets.
const themes = [
  { Balham: 'ag-theme-balham' },
  // { 'Balham Dark': 'ag-theme-balham-dark' },
  { Fresh: 'ag-theme-fresh' },
  { Dark: 'ag-theme-dark' },
  { Blue: 'ag-theme-blue' },
  // { Material: 'ag-theme-material' }, // TODO: bug in header.
  { Bootstrap: 'ag-theme-bootstrap' },
];

const defaultTheme = 'ag-theme-balham';

const addCSS = link => {
  const linkElement = document.createElement('link');

  linkElement.setAttribute('rel', 'stylesheet');
  linkElement.setAttribute('href', link);

  document.getElementsByTagName('head')[0].appendChild(linkElement);
};

// Load all ag-grid default style themes.
const loadStylesheets = () => {
  addCSS('https://unpkg.com/ag-grid-community/dist/styles/ag-grid.css');
  themes.forEach(theme => {
    addCSS(`https://unpkg.com/ag-grid-community/dist/styles/${theme[Object.keys(theme)]}.css`);
  });
};

//
// User-defined cell renderers
//

// The mere presence of this renderer is enough to actually render HTML.
const baseCellRenderer = obj => obj.value;

// Looker's table is 1-indexed.
const rowIndexRenderer = obj => obj.rowIndex + 1;

//
// User-defined aggregation functions
//

const aggregate = (values, mType, valueFormat) => {
  if (_.isEmpty(values)) { return; }
  let agg;
  // TODO Support for more types of aggregations:
  // https://docs.looker.com/reference/field-reference/measure-type-reference
  if (mType === 'count') {
    agg = countAggFn(values);
  } else if (mType === 'average') {
    agg = avgAggFn(values);
  } else {
    // Default to sum.
    agg = sumAggFn(values);
  }
  let value;
  if (_.isEmpty(valueFormat)) {
    value = isFloat(agg) ? truncFloat(agg, values) : agg;
  } else {
    // TODO EUR and GBP symbols don't play nice. It fails gracefully though.
    value = numeral(agg).format(valueFormat);
  }
  return value;
};

const sumAggFn = values => {
  return _.reduce(values, (sum, n) => {
    return sum + n;
  }, 0);
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

//
// Aggregation helper functions
//

const truncFloat = (float, values) => {
  const digits = values[0].toString().split('.').pop().length;
  return float.toFixed(digits);
};

const isFloat = num => {
  return Number.isInteger(num) === false && num % 1 !== 0;
};

// In order to maintain proper formatting for aggregate columns, we are using
// a group aggregate function, which requires us to calculate aggregates for
// all columns at once. As a result, the code is significantly more complex
// than if we had used the simpler ag-grid individual column aggregate.
const groupRowAggNodes = nodes => {
  if (!_.isEmpty(gridOptions.columnDefs)) { return; }
  // This method is called often by ag-grid, sometimes with no nodes.
  const { queryResponse } = globalConfig;
  if (_.isEmpty(nodes) || queryResponse === undefined) { return; }

  const { measure_like: measures } = queryResponse.fields;
  const result = {};
  if (!_.isEmpty(queryResponse.pivots)) {
    const { pivots } = queryResponse;
    const fields = pivots.flatMap(pivot => {
      return measures.map(measure => { return `${pivot.key}_${measure.name}`; });
    });
    fields.forEach(field => { result[field] = []; });
    nodes.forEach(node => {
      const data = node.group ? node.aggData : node.data;
      fields.forEach(field => {
        if (typeof data[field] !== 'undefined') {
          const value = numeral(data[field]).value();
          if (value !== null) {
            result[field].push(value);
          }
        }
      });
    });
    pivots.forEach(pivot => {
      // Map over again to calculate a final result value and convert to value_format.
      measures.forEach(measure => {
        const { type: mType, value_format: valueFormat } = measure;
        const formattedField = `${pivot.key}_${measure.name}`;
        result[formattedField] = aggregate(
          result[formattedField], mType, valueFormat,
        ) || LookerCharts.Utils.textForCell({ value: null });
      });
    });
  } else {
    // XXX Merge this loop below.
    measures.forEach(measure => {
      result[measure.name] = [];
    });
    // Map over once to determine type and populate results array.
    nodes.forEach(node => {
      const data = node.group ? node.aggData : node.data;
      measures.forEach(measure => {
        const { name } = measure;
        if (typeof data[name] !== 'undefined') {
          const value = numeral(data[name]).value();
          if (value !== null) {
            result[name].push(value);
          }
        }
      });
    });

    // Map over again to calculate a final result value and convert to value_format.
    measures.forEach(measure => {
      const { name, type: mType, value_format: valueFormat } = measure;
      result[name] = aggregate(
        result[name], mType, valueFormat,
      );
    });
  }

  const { config, range } = globalConfig;
  // The top level aggregate here isn't actually shown on our grouped table, and
  // shouldn't be counted towards the conditional formatting ranges.
  const includeInRange = nodes[0].level !== 0;
  if (includeInRange && config.enableConditionalFormatting && config.conditionalFormattingType !== 'non_subtotals_only') {
    // We want to add subtotal values to the ranges. Note: This isn't ideal/finalized behavior;
    // final behavior would have these values exist within their own range, which will require
    // cellStyle to understand if the cell is a subtotal (I think possible), and then draw from a diff. range.
    if (!_.isEmpty(queryResponse.fields.pivots)) {
      range['pivotKeys'] = [];
    }
    _.forEach(result, (value, key) => {
      let val = numeral(value).value();
      if (_.isNull(val) && config.includeNullValuesAsZero) {
        val = 0;
      }
      if (!_.isEmpty(queryResponse.fields.pivots)) {
        range['pivotKeys'].push(key);
      }
      updateRange(range, key, val);
    });
  }
  return result;
};

//
// User-defined grouped header class
//

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
  const customLabel = config[`customLabel_${dimension.name}`];
  if (customLabel !== undefined && customLabel !== '') {
    label = config[`customLabel_${dimension.name}`];
  } else if (config.showFullFieldName) {
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

const alignText = (styling, cell, config) => {
  const { measure } = cell.colDef;
  const alignment = `align_${measure}`;
  if (alignment in config) {
    styling['text-align'] = config[alignment];
  }
};

const formatText = (styling, cell, config) => {
  const { measure } = cell.colDef;
  const fontFormat = `fontFormat_${measure}`;
  if (fontFormat in config && config[fontFormat] !== 'none') {
    switch (config[fontFormat]) {
      case 'bold':
        styling['font-weight'] = '800';
        break;
      case 'italic':
        styling['font-style'] = 'italic';
        break;
      case 'underline':
        styling['text-decoration'] = 'underline';
        break;
      case 'strikethrough':
        styling['text-decoration'] = 'line-through';
        break;
    }
  }
};

const applyConditionalFormatting = (styling, cell, config) => {
  const { range } = globalConfig;
  const { field, measure } = cell.colDef;
  // for pivots, it'll be const { field } = cell.colDef;, can we use for both?

  if (config.enableConditionalFormatting === undefined || !config.enableConditionalFormatting) { return; }
  if (config.conditionalFormattingType === 'non_subtotals_only' && cell.node.group === true) { return; }
  if (config.conditionalFormattingType === 'subtotals_only' && cell.node.group === false) { return; }

  if (!(range.keys.includes(measure))) { return; }
  const { lowColor, midColor, highColor } = config;
  let colorScheme = [lowColor, midColor, highColor];
  if (config.formattingStyle === 'high_to_low') {
    colorScheme = [highColor, midColor, lowColor];
  }
  const scale = chroma.scale(colorScheme.filter(color => !!color));
  let supportedRange = range;
  // Here's where it changes for pivots.
  if (config.perColumnRange) {
    if ('pivotKeys' in range) {
      supportedRange = range[field];
    } else {
      supportedRange = range[measure];
    }
  }
  // Normalize number between 0 and 1
  const v = numeral(cell.value).value();
  if (!config.includeNullValuesAsZero && _.isNull(v)) {
    return;
  }
  let normalizedValue = normalize(v, supportedRange);
  if (isNaN(normalizedValue) || _.isNull(normalizedValue)) {
    if (!config.includeNullValuesAsZero) { return; }
    normalizedValue = 0;
  }

  styling['background-color'] = scale(normalizedValue).hex();
};

// Used to apply conditional formatting to cells, if enabled.
const cellStyle = cell => {
  const { config, range } = globalConfig;

  const styling = {};
  alignText(styling, cell, config);
  formatText(styling, cell, config);
  applyConditionalFormatting(styling, cell, config);
  return styling;
};

const normalize = (value, range) => {
  // Edge case when there is only one value to avoid NaN response.
  if (range.max === range.min && value === range.max) { return 1; }
  return (value - range.min) / (range.max - range.min);
};

const updateRange = (range, key, num) => {
  const { config } = globalConfig;
  if (_.isNull(num)) {
    if (config.includeNullValuesAsZero) {
      num = 0;
    } else {
      return;
    }
  }
  // Global
  if (!('min' in range) || num < range.min) {
    range.min = num;
  }
  if (!('max' in range) || num > range.max) {
    range.max = num;
  }
  // Per field
  if (!(key in range)) {
    range[key] = { min: num, max: num };
  } else {
    if (num < range[key].min) {
      range[key].min = num;
    }
    if (num > range[key].max) {
      range[key].max = num;
    }
  }
};

const setNonPivotRange = (datum, key, range) => {
  const { config } = globalConfig;
  if (config === undefined || 'includeNullValuesAsZero' in config) { return; }
  const val = datum[key].value;
  if (!config.includeNullValuesAsZero && _.isNull(val)) { return; }
  if (!isNaN(val)) {
    const num = Number(val);
    updateRange(range, key, num);
  }
};

// We are going to need to have a separate key for each pivot:field combo.
// Global can possibly be shared somehow, if we can extract the value and pass into a fn.
const setPivotRange = (datum, key, range) => {
  const { config } = globalConfig;
  if (config === undefined || 'includeNullValuesAsZero' in config) { return; }
  range['pivotKeys'] = [];
  _.forEach(datum[key], (v, pivot) => {
    // XXX I'd prefer this to be ':', can it be standardized like this elsewhere?
    const pivotKey = `${pivot}_${key}`;
    range['pivotKeys'].push(pivotKey);

    const val = v.value;
    if (!config.includeNullValuesAsZero && _.isNull(val)) { return; }
    if (!isNaN(val)) {
      const num = Number(val);
      updateRange(range, pivotKey, num);
    }
  });
};

// For each column, calculate and store the min/max values for optional conditional formatting.
const calculateRange = (data, queryResponse, config) => {
  if (!('applyTo' in config)) { return {}; }
  let keys = _.map(queryResponse.fields.measure_like, measureLike => measureLike.name);
  if (config.applyTo === 'select_fields') {
    keys = keys.filter(key => globalConfig.selectedFields.includes(key));
  }
  const range = { keys };
  if (config.conditionalFormattingType === 'subtotals_only') { return range; }

  data.forEach(datum => {
    keys.forEach(key => {
      if (_.isEmpty(queryResponse.pivots)) {
        setNonPivotRange(datum, key, range);
      } else {
        setPivotRange(datum, key, range);
      }
    });
  });

  return range;
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

// Base dimensions before table calcs, pivots, measures, etc added.
const basicDimensions = (dimensions, config) => {
  const finalDimension = dimensions[dimensions.length - 1];
  const basics = _.map(dimensions, dimension => {
    const rowGroup = !(dimension.name === finalDimension.name);
    return {
      cellRenderer: baseCellRenderer,
      cellStyle,
      colType: 'default',
      field: dimension.name,
      headerName: headerName(dimension, config),
      hide: true,
      lookup: dimension.name,
      rowGroup: rowGroup,
      suppressMenu: true,
    };
  });

  if (config.showRowNumbers) {
    addRowNumbers(basics);
  }

  autoGroupColumnDef.setLastGroup(finalDimension.name);

  return basics;
};

const addTableCalculations = (dimensions, tableCalcs) => {
  let dimension;
  tableCalcs.forEach(calc => {
    dimension = {
      cellStyle,
      colType: 'table_calculation',
      field: calc.name,
      headerName: calc.label,
      lookup: calc.name,
      rowGroup: false,
      suppressMenu: true,
    };
    dimensions.push(dimension);
  });
};

const addMeasures = (dimensions, measures, config) => {
  let dimension;
  measures.forEach(measure => {
    const { name } = measure;
    dimension = {
      cellStyle,
      colType: 'measure',
      field: name,
      headerName: headerName(measure, config),
      lookup: name,
      measure: name,
      rowGroup: false,
      suppressMenu: true,
      // colId: 'jj',
    };
    dimensions.push(dimension);
  });
};

// For every pivot there will be a column for all measures and table calcs.
const addPivots = (dimensions, config) => {
  const { queryResponse } = globalConfig;
  const { measure_like: measureLike } = queryResponse.fields;
  const { pivots } = queryResponse;

  let dimension;
  pivots.forEach(pivot => {
    const { key } = pivot;

    const outerDimension = {
      children: [],
      colType: 'pivot',
      field: key,
      headerGroupComponent: PivotHeader,
      headerName: key,
      rowGroup: false,
      suppressMenu: true,
    };

    measureLike.forEach(measure => {
      const { name } = measure;
      dimension = {
        cellStyle,
        colType: 'pivotChild',
        columnGroupShow: 'open',
        field: `${key}_${name}`,
        headerName: headerName(measure, config),
        measure: name,
        pivotKey: key,
        rowGroup: false,
        suppressMenu: true,
      };
      outerDimension.children.push(dimension);
    });

    dimensions.push(outerDimension);
  });
  // Add the title:
  globalConfig.hasPivot = true;
};

// Attempt to display in this order: HTML -> rendered -> value
const displayData = cell => {
  if (_.isEmpty(cell)) { return null; }
  let formattedCell;
  if (cell.html) {
    // XXX This seems to be a diff func than table. OK?
    formattedCell = LookerCharts.Utils.htmlForCell(cell);
  } else {
    formattedCell = LookerCharts.Utils.textForCell(cell);
  }

  return formattedCell;
};

class AutoGroupColumnDef {
  constructor() {
    this.headerName = 'Group';
    this.cellRenderer = 'agGroupCellRenderer';
    this.cellRendererParams = {
      suppressCount: true,
    };
  }

  setLastGroup(field) {
    this.field = field;
  }
}

const autoGroupColumnDef = new AutoGroupColumnDef();

// TODO: Persist column movement across refresh.
const columnResized = e => {

};

const gridOptions = {
  animateRows: true,
  autoGroupColumnDef,
  columnDefs: [],
  enableFilter: false,
  enableSorting: false,
  groupDefaultExpanded: -1, // for dev purposes. 0,
  groupRowAggNodes,
  onFirstDataRendered: setColumns,
  onRowGroupOpened: adjustFonts,
  rowSelection: 'multiple',
  suppressAggFuncInHeader: true,
  suppressFieldDotNotation: true,
  suppressMovableColumns: true,
  enableColResize: true,
  onColumnResized: columnResized,
  colResizeDefault: 'shift',
};

// const hideRange = (config, queryResponse) => {
//   return true;//config.enableConditionalFormatting === false;
// };

const options = {
  // FORMATTING
  enableConditionalFormatting: {
    default: false,
    label: 'Enable Conditional Formatting',
    order: 1,
    section: 'Formatting',
    type: 'boolean',
  },
  perColumnRange: {
    default: true,
    hidden: true,
    label: 'Per column range',
    order: 2,
    section: 'Formatting',
    type: 'boolean',
  },
  conditionalFormattingType: {
    default: 'all',
    display: 'select',
    label: 'Formatting Type',
    order: 3,
    section: 'Formatting',
    type: 'string',
    values: [
      { 'All': 'all' },
      { 'Subtotals only': 'subtotals_only' },
      { 'Non-subtotals only': 'non_subtotals_only' },
    ],
  },
  includeNullValuesAsZero: {
    default: false,
    label: 'Include Null Values as Zero',
    order: 4,
    section: 'Formatting',
    type: 'boolean',
  },
  formattingStyle: {
    default: 'low_to_high',
    display: 'select',
    label: 'Format',
    order: 5,
    section: 'Formatting',
    type: 'string',
    values: [
      { 'From low to high': 'low_to_high' },
      { 'From high to low': 'high_to_low' },
    ],
  },
  // Detect change to just one config setting? Maybe have another, invisible if possible, set to custom?
  formattingPalette: {
    default: 'red_yellow_green',
    display: 'select',
    label: 'Palette',
    order: 6,
    section: 'Formatting',
    type: 'string',
    values: [
      { 'Red to Yellow to Green': 'red_yellow_green' },
      { 'Red to White to Green': 'red_white_green' },
      { 'Red to White': 'red_white' },
      { 'White to Green': 'white_green' },
      { 'Custom...': 'custom' },
    ],
  },
  lowColor: {
    display: 'color',
    display_size: 'third',
    hidden: true,
    label: 'Low', // These values updated in updateAsync
    order: 7,
    section: 'Formatting',
    type: 'string',
  },
  midColor: {
    display: 'color',
    display_size: 'third',
    hidden: true,
    label: 'Middle',
    order: 8,
    section: 'Formatting',
    type: 'string',
  },
  highColor: {
    display: 'color',
    display_size: 'third',
    hidden: true,
    label: 'High',
    order: 9,
    section: 'Formatting',
    type: 'string',
  },
  applyTo: {
    default: 'all_numeric_fields',
    display: 'select',
    label: 'Apply to',
    order: 10,
    section: 'Formatting',
    type: 'string',
    values: [
      { 'All numeric fields': 'all_numeric_fields' },
      { 'Select fields...': 'select_fields' },
    ],
  },
  // CONFIG
  fontSize: {
    default: 12,
    display_size: 'third',
    label: 'Font size (pt)',
    order: 1,
    section: 'Config',
    type: 'number',
  },
  fontFamily: {
    default: 'Helvetica',
    display: 'select',
    display_size: 'two-thirds',
    label: 'Font Family',
    order: 2,
    section: 'Config',
    type: 'string',
    values: [
      { 'Helvetica': 'BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif' },
      { 'Times New Roman': 'Times, "Times New Roman", serif' },
    ],
  },
  rowHeight: {
    default: 25,
    display_size: 'third',
    label: 'Row Height',
    order: 3,
    section: 'Config',
    type: 'number',
  },
  // SERIES
  truncateColumnNames: {
    default: false,
    label: 'Truncate Column Names',
    order: 1,
    section: 'Series',
    type: 'boolean',
  },
  showFullFieldName: {
    default: false,
    label: 'Show Full Field Name',
    order: 2,
    section: 'Series',
    type: 'boolean',
  },
  // CUSTOMIZATIONS

  // PLOT
  theme: {
    default: defaultTheme,
    display: 'select',
    label: 'Table Theme',
    order: 1,
    section: 'Plot',
    type: 'string',
    values: themes,
  },
  showRowNumbers: {
    default: true,
    label: 'Show Row Numbers',
    order: 2,
    section: 'Plot',
    type: 'boolean',
  },
};

const defaultColors = {
  red: '#F36254',
  green: '#4FBC89',
  yellow: '#FCF758',
  white: '#FFFFFF',
};

const addOptionCustomLabels = fields => {
  fields.forEach(field => {
    const { label, name } = field;
    const cl = `customLabel_${name}`;
    options[cl] = {
      display: 'text',
      placeholder: `Label: ${label}`,
      label,
      section: 'Series',
      type: 'string',
    };
    if (validChanges.indexOf(cl) === -1) { validChanges.push(cl); }
  });
};

const addOptionAlignments = fields => {
  fields.forEach(field => {
    const { label, name } = field;
    const alignment = `align_${name}`;
    // Radio freaks out here. Maybe flip display/type?
    options[alignment] = {
      default: 'left',
      display: 'select',
      label: `text-align: ${label}`,
      section: 'Config',
      type: 'string',
      values: [
        { 'Left': 'left' },
        { 'Center': 'center' },
        { 'Right': 'right' },
      ],
    };
  });
};

const addOptionFontFormats = fields => {
  fields.forEach(field => {
    const { label, name } = field;
    const fontFormat = `fontFormat_${name}`;
    options[fontFormat] = {
      default: 'none',
      display: 'select',
      label: `Format: ${label}`,
      section: 'Config',
      type: 'string',
      values: [
        { 'None': 'none' },
        { 'Bold': 'bold' },
        { 'Italic': 'italic' },
        { 'Underline': 'underline' },
        { 'Strikethrough': 'strikethrough' },
      ],
    };
  });
};

updateColorConfig = (vis, config) => {
  const originalMidColor = {
    display: 'color',
    display_size: 'third',
    label: 'Middle',
    order: 7,
    section: 'Formatting',
    type: 'string',
  };
  // Automatically set the colors to defaults when selected.
  if ('formattingPalette' in config && config.formattingPalette !== 'custom') {
    let colors;
    switch (config.formattingPalette) {
      case 'red_yellow_green':
        if (!('midColor' in options)) { options.midColor = originalMidColor; }
        colors = [
          { lowColor: defaultColors.red },
          { midColor: defaultColors.yellow },
          { highColor: defaultColors.green },
        ];
        break;
      case 'red_white_green':
        if (!('midColor' in options)) { options.midColor = originalMidColor; }
        colors = [
          { lowColor: defaultColors.red },
          { midColor: defaultColors.white },
          { highColor: defaultColors.green },
        ];
        break;
      case 'red_white':
        if ('midColor' in options) { delete(options.midColor); }
        colors = [
          { lowColor: defaultColors.red },
          { highColor: defaultColors.white },
        ];
        break;
      case 'white_green':
        if ('midColor' in options) { delete(options.midColor); }
        colors = [
          { lowColor: defaultColors.white },
          { highColor: defaultColors.green },
        ];
        break;
    }
    _.forEach(colors, color => vis.trigger('updateConfig', [color]));
  }

  // Flip the labels accordingly.
  if (config.formattingStyle === 'high_to_low') {
    options.lowColor.label = 'High';
    options.highColor.label = 'Low';
  } else {
    options.lowColor.label = 'Low';
    options.highColor.label = 'High';
  }
};

// Decide which columns will be getting conditional formatting applied.
const selectFormattedFields = (fields, config) => {
  if (config.applyTo === 'select_fields') {
    fields.forEach(field => {
      const { label, name } = field;
      const id = `selectedField_${name}`
      options[id] = {
        label,
        default: 'false',
        section: 'Formatting',
        type: 'boolean',
      };
    });
    fields.forEach(field => {
      const { name } = field;
      if (config[`selectedField_${name}`] === true) {
        globalConfig.addSelectedField(name);
      } else {
        globalConfig.removeSelectedField(name);
      }
    });
  } else if (config.applyTo === 'all_numeric_fields') {
    fields.forEach(field => {
      const { label, name } = field;
      const id = `selectedField_${name}`
      if (id in options) { delete(options[id]); }
    });
  }
};

const setupConditionalFormatting = (vis, config, measureLike) => {
  updateColorConfig(vis, config);
  selectFormattedFields(measureLike, config);

  if ('enableConditionalFormatting' in config) {
    options.perColumnRange.hidden = !config.enableConditionalFormatting;
  }

  if ('formattingPalette' in config) {
    const showColors = config.formattingPalette === 'custom';
    options.lowColor.hidden = !showColors;
    if ('midColor' in options) { options.midColor.hidden = !showColors; }
    options.highColor.hidden = !showColors;
  }
};


// Once columns are available to ag-grid, we can update the options hash / config
// and add/remove custom configurations.
// This triggers two events on the visualization object:
//   vis.trigger('registerOptions', options)
//   vis.trigger('updateConfig', [config])
const modifyOptions = (vis, config) => {
  const { measure_like: measureLike } = globalConfig.queryResponse.fields;

  addOptionCustomLabels(measureLike);
  addOptionAlignments(measureLike);
  addOptionFontFormats(measureLike);

  setupConditionalFormatting(vis, config, measureLike);

  vis.trigger('registerOptions', options);
};


// TODO: Hack that only works for 1 pivot.
const addPivotHeader = (queryResponse, config) => {
  const name = headerName(queryResponse.fields.pivots[0], config);
  const titleDiv = document.getElementsByClassName('ag-header-group-cell-no-group')[0];
  if (titleDiv !== undefined) {
    titleDiv.innerHTML = `${name}:`;
    titleDiv.style.textAlign = 'right';
  }
};

const validChanges = ['showRowNumbers', 'showFullFieldName', 'truncateColumnNames'];
// Certain config changes require a refresh of the column headers - we only
// will refresh them if needed.
// There is a bug here where we actually need to call this twice to get subtotals
// displaying properly. I assume there is a specific event I can plug into to do
// away with this timeout, but haven't found it yet. Anything less than 300 doesn't work.
const refreshColumns = changed => {
  const { config } = changed;
  if (config === undefined) { return }
  let needsChange = false;
  _.forEach(validChanges, change => {
    if (config.indexOf(change) !== -1) {
      needsChange = true;
    }
  });
  if (needsChange) {
    setColumns();
    setTimeout(function() {
      setColumns();
      autoSize();
    }, 500);
  }
};

looker.plugins.visualizations.add({
  options: options,

  create(element) {
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
    this.grid.id = 'ag-grid-vis';
    this.grid.className = 'ag-grid-vis';

    this.grid.classList.add(defaultTheme);
    new agGrid.Grid(this.grid, gridOptions); // eslint-disable-line
  },

  updateAsync(data, _element, config, queryResponse, details, done) {
    this.clearErrors();

    globalConfig.queryResponse = queryResponse;
    modifyOptions(this, config);

    const { fields } = queryResponse;
    const { dimensions, measures, pivots, table_calculations: tableCalcs } = fields;
    if (dimensions.length === 0) {
      this.addError({
        message: 'This chart requires dimensions.',
        title: 'No Dimensions',
      });
      return;
    }

    if (!_.isEmpty(pivots) && (_.isEmpty(measures) && _.isEmpty(tableCalcs))) {
      this.addError({
        message: 'Add a measure or table calculation to pivot on.',
        title: 'Empty Pivot(s)',
      });
      return;
    }

    updateTheme(this.grid.classList, config.theme);

    // Gets a range for use by conditional formatting.
    const range = calculateRange(data, queryResponse, config);
    globalConfig.range = range;
    globalConfig.config = config;

    // Manipulates Looker's queryResponse into a format suitable for ag-grid.
    this.agColumn = new AgColumn(config);
    const { formattedColumns } = this.agColumn;

    globalConfig.formattedColumns = formattedColumns;
    refreshColumns(details.changed);

    // Manipulates Looker's data response into a format suitable for ag-grid.
    this.agData = new AgData(data, formattedColumns);
    globalConfig.agData = this.agData;

    gridOptions.api.setRowData(this.agData.formattedData);

    adjustFonts();

    if (globalConfig.hasPivot) { addPivotHeader(queryResponse, config); }

    autoSize();
    // Not sure why this is here, doesn't seem to have an effect.
    done();
  },
});
