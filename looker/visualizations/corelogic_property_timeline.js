/* global d3 */
/* eslint-disable no-console */
(function () {

    const columns = {
        event_type: 'corelogic_property_viz.event_type',
        event_date: 'corelogic_property_viz.event_date',
        event_value: 'corelogic_property_viz.event_value',
        event_hover: 'corelogic_property_viz.event_hover',
        property_id: 'corelogic_property_viz.property_id',
        loan_id: 'corelogic_property_viz.loan_id',
        owner_id: 'corelogic_property_viz.owner_id',
    }

    // eslint-disable-next-line no-unused-vars
    function log() {
        console.log.apply(console, arguments)
    }

    function sortByDateAscending(a, b) {
        return a[columns.event_date] - b[columns.event_date]
    }

    // data massager
    function massageData(input_data) {
        log('input_data', input_data)
        window.input_data = input_data
        const events = (
            input_data
                .map((row, i) => {
                    const mapped = {}
                    Object.keys(row).forEach(key => {
                        mapped[key] = row[key].value
                    })
                    mapped[columns.event_hover] = row[columns.event_hover].html
                    mapped[columns.event_date] = convertDateStringToDate(mapped[columns.event_date])
                    return mapped
                })
        )
        log('events', events)
        events.sort(sortByDateAscending)
        return events
    }

    // begin shared looker stuff

    // eslint-disable-next-line no-unused-vars
    function unique(value, index, self) {
        return self.indexOf(value) === index
    }

    function getEventYear(event) {
        const date = event[columns.event_date]
        return date.getFullYear()
    }

    function convertDateStringToDate(datestring) {
        return new Date(`${datestring.replace(/-/g, '/')} 12:00:00`)
    }

    function convertYearStringToDate(year) {
        const datestring = `${year}-01-01`
        return convertDateStringToDate(datestring)
    }

    function getYearStart(event) {
        const year = getEventYear(event)
        return convertYearStringToDate(year)
    }

    function doubleDigit(n) {
        const s = String(n)
        if (s.length > 1) return s
        return `0${s}`
    }

    function prettyDollarValue(n) {
        return `$${n.toLocaleString()}`
    }

    function prettyDollarLegend(n) {
        if (n < 1000) return n
        if (n >= 1000 && n < 1000000) return `${n / 1000}K`
        return `${n / 1000000}M`
    }

    function prettyPercentValue(n) {
        return `${n}%`
    }

    // eslint-disable-next-line no-unused-vars
    function prettyDate(date) {
        const year = date.getFullYear()
        const month = doubleDigit(date.getMonth() + 1)
        const day = doubleDigit(date.getDate())
        return `${year}-${month}-${day}`
    }

    // eslint-disable-next-line no-unused-vars
    function getTooltip(d) {
        return d[columns.event_hover]
    }

    const chart_types = [
        {
            type: 'MarketValue',
            label: 'Valuation: Market Value',
            unit: 'dollar',
            valueFormatter: prettyDollarValue,
            legendFormatter: prettyDollarLegend,
        },
        {
            type: 'ReconstructionCost',
            label: 'Valuation: Reconstruction Cost',
            unit: 'dollar',
            valueFormatter: prettyDollarValue,
            legendFormatter: prettyDollarLegend,
        },
        {
            type: 'PropensityRefinance',
            label: 'Propensity: Refinance',
            unit: 'percent',
            valueFormatter: prettyPercentValue,
            legendFormatter: prettyPercentValue,
        },
        {
            type: 'PropensityDefault',
            label: 'Propensity: Default',
            unit: 'percent',
            valueFormatter: prettyPercentValue,
            legendFormatter: prettyPercentValue,
        },
        {
            type: 'PropensityList',
            label: 'Propensity: List',
            unit: 'percent',
            valueFormatter: prettyPercentValue,
            legendFormatter: prettyPercentValue,
        },
    ]

    const header_height = 50
    const loan_height = 150
    const property_height = 200
    const year_label_height = 30
    const owner_height = 150
    const footer_height = 50
    const canvas_height = header_height + loan_height + property_height + owner_height + footer_height
    const chart_height = 189
    const event_label_height = 20
    const event_label_bottom_margin = 30

    const vis = {

        id: 'corelogic-property-timeline-dev',
        label: 'Property Timeline',
        options: {},

        chart_type: chart_types[0].type,

        updateStyles(element, settings) {
            element.innerHTML = `
                html, body, #vis {
                    width: auto;
                    height: auto;
                    margin: 0;
                    padding: 0;
                }

                .visualization {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    font-size: 12px;
                    color: #ccc;
                    background-color: #252827;
                    width: 100%;
                    overflow: hidden;
                }

                .pane {
                    overflow-x: scroll;
                    position: relative;
                    padding-left: 150px;
                }

                .chart-nav {
                    position: absolute;
                    box-sizing: border-box;
                    padding-left: 150px;
                    padding-right: 50px;
                    top: 0px;
                    left: 0px;
                    width: 100%;
                }
                .chart-nav ul {
                    display: block;
                    margin: 0;
                    padding: 0;
                    padding-top: 10px;
                    padding-left: 10px;
                    padding-right: 10px;
                    list-style: none;
                    height: ${header_height}px;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    justify-content: center;
                    overflow: hidden;
                }
                .chart-nav li {
                    padding: 15px 1px;
                    padding-left: 36px;
                    font-size: 14px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.3);
                    cursor: pointer;
                    margin-left: 10px;
                    margin-right: 10px;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .chart-nav li::before {
                    display: block;
                    content: "";
                    width: 20px;
                    height: 20px;
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-48%);
                    border: 4px solid;
                    margin-right: 10px;
                    border-radius: 50%;
                }
                .chart-nav li:hover {
                    color: rgba(255, 255, 255, 0.7);
                }
                .chart-nav li.active {
                    color: hsla(39, 75%, 60%, 1.00);
                }
                .chart-nav li.active::before {
                    background-color: hsla(39, 75%, 60%, 1.00);
                }

                .labels {
                    position: fixed;
                    left: 0;
                    top: 0;
                    width: 120px;
                    box-sizing: border-box;
                    padding-top: ${header_height}px;

                    display: flex;
                    flex-direction: column;
                    text-align: right;
                    padding-right: 20px;
                    background-color: #252827;
                }
                .labels .label {
                    font-size: 14px;
                    font-weight: bold;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    padding-bottom: 3px;
                }

                .labels .loan {
                    height: ${loan_height}px;
                }
                .labels .property {
                    height: ${property_height}px;
                }
                .labels .owner {
                    height: ${owner_height}px;
                }

                .legend {
                    position: fixed;
                    right: 0;
                    top: 0;
                    width: 50px;
                    box-sizing: border-box;
                    background-color: #252827;
                    height: ${header_height + loan_height + property_height + owner_height + footer_height}px;
                }

                svg.legend-labels {
                    fill: #ccc;
                    margin-top: ${header_height + loan_height}px;
                }

                svg.canvas {
                    fill: #ccc;
                    text-anchor: middle;
                }

                .year-dot {
                    stroke: #ccc;
                    stroke-width: 3px;
                    fill: #252827;
                }
                text {
                    cursor: default;
                }
                text.event-label:hover {
                    fill: white;
                }
                text.year-label {
                    font-weight: bold;
                    font-style: italic;
                }

                svg.bar-chart .bar {
                    fill: #a87c2b;
                    stroke: black;
                    stroke-width: 1px;
                }
                svg.bar-chart .bar:hover {
                    fill: #ac8340;
                }
                svg.bar-chart .line {
                    fill: rgba(255, 255, 255, 0.1);
                }

                svg.loan-events .line {
                    fill: #1d1d1d;
                }
                svg.loan-events .period-line {
                    fill: #155af7;
                }
                .loan-dot {
                    stroke: #155af7;
                    stroke-width: 3px;
                    fill: #252827;
                }

                svg.owner-events .line {
                    fill: rgba(255, 255, 255, 0.2);
                    fill: #515352;
                }
                svg.owner-events .period-line {
                    fill: #ff8729;
                }
                .owner-dot {
                    stroke: #ff8729;
                    stroke-width: 3px;
                    fill: #252827;
                }
                .owner-solo-dot {
                    stroke: #515352;
                    stroke-width: 3px;
                    fill: #252827;
                }
                .connector {
                    stroke: rgba(255, 255, 255, 0.3);
                    stroke-width: 2px;
                    stroke-dasharray: 4px;
                    fill: none;
                }
                .owner-start-marker {
                    fill: rgba(255, 255, 255, 0.02);
                }
                .tip {
                    position: absolute;
                    box-sizing: border-box;
                    padding: 5px 15px;
                    background-color: white;
                    opacity: 0;
                    z-index: -1;
                    color: #333;
                    border-radius: 5px;
                    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
                }
                .tip.active {
                    opacity: 1;
                    z-index: 1;
                }
                .tip p {
                    margin: 10px 0;
                }

            `
        },

        create(element, settings) {
            log('create')
            element.classList.add('visualization')

            const style = document.createElement('style')
            document.head.appendChild(style)
            vis.updateStyles(style, settings)

            const pane = document.createElement('div')
            pane.classList.add('pane')
            element.appendChild(pane)

            const labels = document.createElement('div')
            labels.classList.add('labels')
            pane.appendChild(labels)

            function addLabel(label, className) {
                const node = document.createElement('div')
                const text = document.createElement('span')
                text.innerText = label
                text.classList.add('label-text')
                node.classList.add('label')
                node.classList.add(className)
                node.appendChild(text)
                labels.appendChild(node)
            }

            addLabel('Life of Loan', 'loan')
            addLabel('Property', 'property')
            addLabel('Ownership', 'owner')

            const legend = document.createElement('div')
            legend.classList.add('legend')
            pane.appendChild(legend)

            const canvas = d3
                .select(pane)
                .append('svg')
                .attr('class', 'canvas')
                .attr('height', canvas_height)

            const header = canvas
                .append('svg')
                .attr('class', 'header')
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', header_height)

            const bar_chart = canvas
                .append('svg')
                .attr('class', 'bar-chart')
                .attr('x', 0)
                .attr('y', header_height + loan_height)
                .attr('height', chart_height)

            const loan_events = canvas
                .append('svg')
                .attr('class', 'loan-events')
                .attr('x', 0)
                .attr('y', header_height)
                .attr('height', loan_height)

            const property_events = canvas
                .append('svg')
                .attr('class', 'property-events')
                .attr('x', 0)
                .attr('y', header_height + loan_height)
                .attr('height', property_height)

            const year_labels = canvas
                .append('svg')
                .attr('class', 'year-labels')
                .attr('x', 0)
                .attr('y', header_height + loan_height + property_height)
                .attr('height', year_label_height)

            const owner_events = canvas
                .append('svg')
                .attr('class', 'owner-events')
                .attr('x', 0)
                .attr('y', header_height + loan_height + property_height)
                .attr('height', owner_height)

            const footer = canvas
                .append('svg')
                .attr('class', 'footer')
                .attr('x', 0)
                .attr('y', header_height + loan_height + property_height + owner_height)
                .attr('height', footer_height)

            const legend_labels = d3
                .select(legend)
                .append('svg')
                .attr('class', 'legend-labels')
                .attr('height', chart_height)

            const nav = document.createElement('nav')
            nav.classList.add('chart-nav')
            const nav_list = document.createElement('ul')
            nav.appendChild(nav_list)

            function activateItem(node, chart) {
                nav_list.querySelectorAll('.active').forEach(n => n.classList.remove('active'))
                node.classList.add('active')
                vis.chart_type = chart.type
                vis.drawChart()
            }

            function addNavItem(chart) {
                const node = document.createElement('li')
                if (vis.chart_type === chart.type) node.classList.add('active')
                node.innerText = chart.label
                node.addEventListener('click', () => {
                    activateItem(node, chart)
                })
                nav_list.appendChild(node)
            }

            chart_types.forEach(addNavItem)

            element.appendChild(nav)

            const tip = document.createElement('div')
            tip.classList.add('tip')
            element.appendChild(tip)

            element.addEventListener('click', e => {
                if (! tip.classList.contains('active')) return
                if (tip.contains(e.target)) return
                tip.classList.remove('active')
            })
            pane.addEventListener('scroll', vis.hideTip)
            tip.addEventListener('mouseenter', vis.cancelHideTip)
            tip.addEventListener('mouseexit', vis.delayHideTip)

            vis.ui = {
                style,
                pane,
                canvas,
                header,
                bar_chart,
                loan_events,
                property_events,
                year_labels,
                owner_events,
                footer,
                legend_labels,
                tip,
            }

            window.vis = vis
        },

        calculatePeriods(events, id_column) {
            const periods = events.map(d => d[id_column]).filter(unique).map(id => {
                const dates = events.filter(d => d[id_column] === id).map(d => d[columns.event_date].getTime())
                if (dates.length < 2) return
                const start = new Date(Math.min.apply(Math, dates))
                const end = new Date(Math.max.apply(Math, dates))
                return {
                    start,
                    end,
                }
            }).filter(d => !! d)

            return periods
        },

        isInPeriod(event, events, id_column) {
            const period_events = events.filter(d => d[id_column] === event[id_column])
            return period_events.length > 1
        },

        drawPeriods(canvas, periods, className, xscale, bottom) {
            const period_lines = canvas.selectAll(`.${className}`).data(periods)
            period_lines.exit().remove()
            period_lines.enter()
                .append('rect')
                .attr('class', className)
                .attr('x', d => {
                    const date = convertYearStringToDate(d.start.getFullYear())
                    return xscale(date.getTime())
                })
                .attr('y', bottom - 10)
                .attr('width', d => {
                    const start = convertYearStringToDate(d.start.getFullYear())
                    const end = convertYearStringToDate(d.end.getFullYear())
                    const x = xscale(start.getTime())
                    const y = xscale(end.getTime())
                    return y - x
                })
                .attr('height', 4)
        },

        drawEventDots(canvas, events, className, xscale, bottom) {
            const dots = canvas.selectAll(`.${className}`).data(events)
            dots.exit().remove()
            dots.enter()
                .append('circle')
                .attr('class', className)
                .attr('cx', d => {
                    const date = getYearStart(d)
                    return xscale(date.getTime())
                })
                .attr('cy', bottom - 8)
                .attr('r', 4.5)
        },

        getEventIndex(events) {
            // create hash of events, indexed by year
            const index = {}
            events.forEach(d => {
                const year = getEventYear(d)
                if (! index[year]) {
                    index[year] = []
                }
                index[year].push(d)
            })
            return index
        },

        drawLine() {
            return (
                d3.line()
                    .x(d => d.x)
                    .y(d => d.y)
            )
        },

        drawConnectors(canvas, index, xscale, y_top, y_bottom) {
            const line_data = Object.keys(index).map(year => {
                const events = index[year]
                const date = convertYearStringToDate(year)
                return [
                    { x: xscale(date.getTime()), y: y_top },
                    { x: xscale(date.getTime()), y: y_bottom - (events.length * event_label_height) + 5 },
                ]
            })
            const lines = canvas.selectAll('.connector').data(line_data)
            const lineFunction = vis.drawLine()
            lines.exit().remove()
            lines.enter()
                .append('path')
                .attr('class', 'connector')
                .attr('d', lineFunction)
        },

        drawEventLabels(canvas, events, className, xscale, y_origin) {
            const index = vis.getEventIndex(events)

            const eventScale = (d) => {
                const year = getEventYear(d)
                const labels = index[year]
                const offset = event_label_height * labels.indexOf(d)
                return y_origin - offset
            }

            const labels = canvas.selectAll(`.${className}`).data(events)
            labels.exit().remove()
            labels.enter()
                .append('text')
                .attr('class', className)
                .attr('x', d => {
                    const date = getYearStart(d)
                    return xscale(date.getTime())
                })
                .attr('y', eventScale)
                .text(d => d[columns.event_value])
                .on('mouseover', d => {
                    if (d[columns.event_hover]) {
                        vis.cancelHideTip()
                        vis.ui.tip.innerHTML = d[columns.event_hover]
                        const tip = vis.ui.tip.getBoundingClientRect()
                        const pane = vis.ui.pane.getBoundingClientRect()
                        let left = d3.event.pageX + 10
                        let top = d3.event.pageY - 10 - tip.height
                        if (left + tip.width > pane.right - 10) {
                            left = pane.right - tip.width - 10
                        }
                        if (top < 10) {
                            top = 10
                        }
                        vis.ui.tip.style.left = `${left}px`
                        vis.ui.tip.style.top = `${top}px`
                        vis.ui.tip.classList.add('active')
                        d3.event.stopPropagation()
                    }
                })
                .on('mouseout', vis.delayHideTip)
        },

        hideTip() {
            clearTimeout(vis.tip_timer)
            vis.ui.tip.classList.remove('active')
        },
        cancelHideTip() {
            clearTimeout(vis.tip_timer)
        },
        delayHideTip() {
            vis.tip_timer = setTimeout(vis.hideTip, 3000)
        },

        getChartDomainEnd(chart_type, n) {
            if (chart_type.unit === 'dollar') {
                const divisor = (
                    n < 100000
                        ? 10000
                        : 500000
                )
                return Math.ceil(n / divisor) * divisor
            }
            if (chart_type.unit === 'percent') {
                return 100
            }
        },

        drawChart() {
            log('drawChart')
            const chart_type = chart_types.find(n => n.type === vis.chart_type)
            log('chart_type', chart_type)

            const events = vis.data.filter(d => d[columns.event_type] === chart_type.type)
            log('events', events)

            const values = events.map(d => Number(d[columns.event_value]))
            const max_value = Math.max.apply(Math, values)
            log('max_value', max_value)
            const domain_end = vis.getChartDomainEnd(chart_type, max_value)
            log('domain_end', domain_end)

            // empty the canvas
            vis.ui.bar_chart.selectAll('*').remove()
            vis.ui.legend_labels.selectAll('*').remove()

            const chartYScale = (
                d3.scaleLinear()
                    .domain([0, domain_end])
                    .range([0, chart_height])
            )

            const chart_blocks = vis.ui.bar_chart.selectAll('.bar').data(events)
            const bar_width = vis.year_width - 10
            chart_blocks.exit().remove()
            chart_blocks.enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('width', bar_width)
                .attr('height', d => chartYScale(Number(d[columns.event_value])))
                .attr('x', d => vis.xscale(d[columns.event_date].getTime()) - bar_width / 2)
                .attr('y', d => chart_height - chartYScale(Number(d[columns.event_value])))
                .append('svg:title')
                .text(d => chart_type.valueFormatter(Number(d[columns.event_value])))

            const chart_division = domain_end / 5
            log('chart_division', chart_division)
            const divisions = [1, 2, 3, 4].map(n => n * chart_division)
            log('divisions', divisions)

            const chart_lines = vis.ui.bar_chart.selectAll('.line').data(divisions)
            chart_lines.exit().remove()
            chart_lines.enter()
                .append('rect')
                .attr('class', 'line')
                .attr('width', vis.width)
                .attr('height', 1)
                .attr('x', 0)
                .attr('y', d => chart_height - chartYScale(d))

            const legend_labels = vis.ui.legend_labels.selectAll('.label').data(divisions)
            legend_labels.exit().remove()
            legend_labels.enter()
                .append('text')
                .attr('class', 'label')
                .attr('x', 8)
                .attr('y', d => chart_height - chartYScale(d) + 4)
                .text(chart_type.legendFormatter)
        },

        drawOwnerStartMarkers(canvas, periods, year_width, xscale, height) {
            const blocks = canvas.selectAll('.owner-start-marker').data(periods)
            const bar_width = year_width
            blocks.exit().remove()
            blocks.enter()
                .append('rect')
                .attr('class', 'owner-start-marker')
                .attr('width', bar_width)
                .attr('height', height)
                .attr('x', d => {
                    const year = d.start.getFullYear()
                    const date = convertYearStringToDate(year)
                    return xscale(date.getTime()) - bar_width / 2
                })
                .attr('y', 0)
        },

        update(input_data, element, settings, resp) {
            log('update')
            vis.updateStyles(vis.ui.style, settings)

            vis.data = massageData(input_data)

            // const types = vis.data.map(d => d[columns.event_type]).filter(unique)
            // log('types', types)

            const years = (
                vis.data
                    .map(getEventYear)
                    .filter(unique)
            )
            // log('years', years)

            const start = Math.min.apply(Math, years)
            const end = Math.max.apply(Math, years)
            // log(start, end)

            const range = end - start
            // log(range)

            const year_ticks = []
            for (let i = start; i <= end; i++) {
                year_ticks.push(convertYearStringToDate(i))
            }

            vis.year_width = 140
            // pad by 1/2 year on each end
            vis.width = (range + 2) * vis.year_width
            vis.ui.canvas.attr('width', vis.width).attr('viewbox', `0 0 ${vis.width} ${canvas_height}`)

            const one_year = 365 * 24 * 60 * 60 * 1000
            // const half_year = one_year / 2
            const domain_start = year_ticks[0].getTime() - one_year
            const domain_end = year_ticks[year_ticks.length - 1].getTime() + one_year
            log('domain_start', domain_start)
            log('domain_end', domain_end)

            const whole_period = {
                start: new Date(domain_start),
                end: new Date(domain_end),
            }

            vis.xscale = (
                d3.scaleLinear()
                    .domain([domain_start, domain_end])
                    .range([0, vis.width])
            )

            // filter loan events
            const loan_events = vis.data.filter(d => d[columns.event_type] === 'Loan')

            // calculate loan periods
            const loan_periods = vis.calculatePeriods(loan_events, columns.loan_id)

            // filter property events
            const property_events = vis.data.filter(d => d[columns.event_type] === 'Property')

            // filter owner events
            const owner_events = vis.data.filter(d => d[columns.event_type] === 'Owner')

            // calculate owner periods
            const owner_periods = vis.calculatePeriods(owner_events, columns.owner_id)
            // log('owner_periods', owner_periods)

            // create pseudo-events for each year
            const year_events = year_ticks.map(year => {
                return {
                    [columns.event_date]: year,
                    [columns.event_value]: year.getFullYear(),
                }
            })

            vis.drawChart()

            /* ========== OWNER MARKERS ========== */
            vis.drawOwnerStartMarkers(vis.ui.header, owner_periods, vis.year_width, vis.xscale, header_height)
            vis.drawOwnerStartMarkers(vis.ui.loan_events, owner_periods, vis.year_width, vis.xscale, loan_height)
            vis.drawOwnerStartMarkers(vis.ui.property_events, owner_periods, vis.year_width, vis.xscale, property_height)
            vis.drawOwnerStartMarkers(vis.ui.owner_events, owner_periods, vis.year_width, vis.xscale, owner_height)
            vis.drawOwnerStartMarkers(vis.ui.footer, owner_periods, vis.year_width, vis.xscale, footer_height)

            /* ========== LOAN EVENTS ========== */
            // draw the horizontal line for the loanline
            vis.drawPeriods(vis.ui.loan_events, [whole_period], 'line', vis.xscale, loan_height)

            // draw the loan periods
            vis.drawPeriods(vis.ui.loan_events, loan_periods, 'period-line', vis.xscale, loan_height)

            // draw a dot for each loan event
            vis.drawEventDots(vis.ui.loan_events, loan_events, 'loan-dot', vis.xscale, loan_height)

            // draw loan event labels
            vis.drawEventLabels(vis.ui.loan_events, loan_events, 'event-label', vis.xscale, loan_height - event_label_bottom_margin)


            /* ========== YEARLINE ========== */
            // draw the horizontal line for the yearline
            vis.drawPeriods(vis.ui.property_events, [whole_period], 'line', vis.xscale, property_height)

            // add a circle for each year
            vis.drawEventDots(vis.ui.property_events, year_events, 'year-dot', vis.xscale, property_height)

            // add a text label for each year
            vis.drawEventLabels(vis.ui.year_labels, year_events, 'year-label', vis.xscale, year_label_height - 13)


            /* ========== PROPERTY EVENTS ========== */
            // draw property event labels
            vis.drawEventLabels(vis.ui.property_events, property_events, 'event-label', vis.xscale, property_height - event_label_bottom_margin)


            /* ========== OWNER EVENTS ========== */
            // draw the horizontal line for the ownerline
            vis.drawPeriods(vis.ui.owner_events, [whole_period], 'line', vis.xscale, loan_height)

            // draw the owner periods
            vis.drawPeriods(vis.ui.owner_events, owner_periods, 'period-line', vis.xscale, owner_height)

            // draw a dot for each owner event
            const owner_period_events = owner_events.filter(d => vis.isInPeriod(d, owner_events, columns.owner_id))
            const owner_solo_events = owner_events.filter(d => ! vis.isInPeriod(d, owner_events, columns.owner_id))
            vis.drawEventDots(vis.ui.owner_events, owner_period_events, 'owner-dot', vis.xscale, owner_height)
            vis.drawEventDots(vis.ui.owner_events, owner_solo_events, 'owner-solo-dot', vis.xscale, owner_height)

            // draw owner event labels
            vis.drawEventLabels(vis.ui.owner_events, owner_events, 'event-label', vis.xscale, owner_height - event_label_bottom_margin)

            // draw connectors for owner events
            const owner_index = vis.getEventIndex(owner_events)
            vis.drawConnectors(vis.ui.owner_events, owner_index, vis.xscale, 28, owner_height - event_label_bottom_margin)

            // draw connectors for loan events
            const loan_index = vis.getEventIndex(loan_events)
            const property_index = vis.getEventIndex(property_events)
            // use property events to calculate position of loan event connectors
            Object.keys(loan_index).forEach(key => {
                loan_index[key] = property_index[key] || []
            })
            vis.drawConnectors(vis.ui.property_events, loan_index, vis.xscale, 5, property_height - event_label_bottom_margin)

            // scroll to end
            vis.scrollToEnd(vis.width)
        },

        scrollToEnd(width) {
            vis.ui.pane.scrollBy(width, 0)
        },

        handleErrors(data, resp) {},
    }

    // end shared looker stuff

    window.looker.plugins.visualizations.add(vis)

}())
