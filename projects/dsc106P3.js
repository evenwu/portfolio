// -------------------------------
// Load the data
// -------------------------------
d3.csv("global_tas_scenarios.csv", d3.autoType).then(data => {
    // Expect columns: year, scenario, anomaly (or tas)
    // If you used "tas" instead of "anomaly", rename it:
    if (data[0].tas !== undefined && data[0].anomaly === undefined) {
        data.forEach(d => d.anomaly = d.tas);
    }

    initChart(data);
});


// -------------------------------
// Main chart function
// -------------------------------
function initChart(data) {

    // -------------------------------
    // Dimensions
    // -------------------------------
    const margin = { top: 40, right: 120, bottom: 50, left: 60 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // -------------------------------
    // SVG
    // -------------------------------
    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet");


    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // hover dot
    const hoverDot = g.append("circle")
        .attr("r", 5)
        .attr("fill", "black")
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("opacity", 0)
        .style("pointer-events", "none");
    
    // -------------------------------
    // Scales
    // -------------------------------
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.anomaly)).nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(["historical", "ssp245", "ssp585"])
        .range(["#4c78a8", "#72b7b2", "#f58518"]);

    // -------------------------------
    // Axes
    // -------------------------------
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    g.append("g")
        .call(d3.axisLeft(y));

    // X‑axis label
    svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", height + margin.top + margin.bottom - 8)
        .text("Year");

    // Y‑axis label
    svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2) - margin.top)
        .attr("y", 13)
        .text("Global Mean Temperature (K)");

    // -------------------------------
    // Line generator
    // -------------------------------
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.anomaly));

    // -------------------------------
    // Group data by scenario
    // -------------------------------
    const scenarios = d3.group(data, d => d.scenario);

    // -------------------------------
    // Draw lines
    // -------------------------------
    scenarios.forEach((values, scenario) => {
        g.append("path")
            .datum(values)
            .attr("fill", "none")
            .attr("stroke", color(scenario))
            .attr("stroke-width", 2)
            .attr("class", `scenario-line ${scenario}`)
            .attr("d", line);
    });

    // -------------------------------
    // Tooltip
    // -------------------------------
    const tooltip = d3.select("#chart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none");

    // -------------------------------
    // Hover interaction
    // -------------------------------
    g.selectAll(".scenario-line")
        .on("mousemove", function (event, d) {
            const [mx] = d3.pointer(event);

            // Convert mouse x → year
            const year = x.invert(mx);

            // Find closest point using binary search for speed
            const bisect = d3.bisector(d => d.year).left;
            const idx = bisect(d, year);

            const a = d[idx - 1];
            const b = d[idx];
            const closest = (!a || (b && (year - a.year > b.year - year))) ? b : a;

            // Move hover dot
            hoverDot
                .attr("cx", x(closest.year))
                .attr("cy", y(closest.anomaly))
                .style("opacity", 1);

            // Tooltip content + position
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${closest.scenario}</strong><br>
                    Year: ${closest.year}<br>
                    Temp: ${closest.anomaly.toFixed(2)} K
                `)
                .style("left", (event.pageX - 600) + "px")
                .style("top", (event.pageY - 200) + "px");
        })
        .on("mouseleave", () => {
            hoverDot.style("opacity", 0);
            tooltip.style("opacity", 0);
        });

    
    // Make all scenario buttons active on startup
    d3.selectAll(".scenario-btn").classed("active", true);

    // -------------------------------
    // Scenario toggle buttons
    // -------------------------------
    d3.selectAll(".scenario-btn").on("click", function () {
        const scenario = this.dataset.scenario;

        // Select the line(s) for this scenario
        const line = d3.selectAll(`.${scenario}`);

        // Check current visibility
        const currentlyHidden = line.classed("hidden");

        // Toggle visibility
        line.classed("hidden", !currentlyHidden);

        // Toggle button boldness
        d3.select(this).classed("active", currentlyHidden);
    });
}