//------------------------------------------------------
// Configuration
//------------------------------------------------------
const margin = { top: 40, right: 20, bottom: 50, left: 60 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const scenarioOrder = ["historical", "ssp126", "ssp245", "ssp585"];
const colorScale = d3.scaleOrdinal()
  .domain(scenarioOrder)
  .range(["#444", "#1f77b4", "#2ca02c", "#d62728"]);

let svg, xScale, yScale, lineGenerator, scenarios;
let originalX, originalY;


//------------------------------------------------------
// Temperature Conversion
//------------------------------------------------------
function convertTemp(value) {
  const unit = document.getElementById("temp-unit").value;

  if (unit === "K") return value;
  if (unit === "C") return value - 273.15;
  if (unit === "F") return (value - 273.15) * 9/5 + 32;
}


//------------------------------------------------------
// Entry Point
//------------------------------------------------------
function init() {
  setupSVG();
  loadData("global_tas_scenarios.csv");
}


//------------------------------------------------------
// SVG Setup
//------------------------------------------------------
function setupSVG() {
  svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
}


//------------------------------------------------------
// Data Loading
//------------------------------------------------------
function loadData(csvPath) {
  d3.csv(csvPath, d => ({
    scenario: d.scenario,
    year: +d.year,
    temp: +d.temp
  })).then(data => {

    scenarios = d3.group(data, d => d.scenario);

    createScales(data);
    storeOriginalDomains();
    createAxes();
    createLineGenerator();
    createScenarioButtons();
    setupAxisControls();
    setupUnitSelector();

    drawLines();
  });
}


//------------------------------------------------------
// Scales
//------------------------------------------------------
function createScales(data) {
  xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, width]);

  yScale = d3.scaleLinear()
    .domain(d3.extent(data, d => convertTemp(d.temp)))
    .nice()
    .range([height, 0]);
}

function storeOriginalDomains() {
  originalX = xScale.domain().slice();
  originalY = yScale.domain().slice();
}


//------------------------------------------------------
// Axes
//------------------------------------------------------
function createAxes() {
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));

  svg.append("text")
    .attr("class", "x-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Year");

  svg.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Temperature (K)");
}

function updateAxes() {
  svg.select(".x-axis")
    .transition()
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  svg.select(".y-axis")
    .transition()
    .call(d3.axisLeft(yScale));

  svg.select(".y-label")
    .text(() => {
      const u = document.getElementById("temp-unit").value;
      return u === "K" ? "Temperature (K)" :
             u === "C" ? "Temperature (°C)" :
                         "Temperature (°F)";
    });
}


//------------------------------------------------------
// Line Generator
//------------------------------------------------------
function createLineGenerator() {
  lineGenerator = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(convertTemp(d.temp)));
}


//------------------------------------------------------
// Draw Lines (domain‑filtered)
//------------------------------------------------------
function drawLines() {
  svg.selectAll(".scenario-line").remove();

  const [xmin, xmax] = xScale.domain();
  const [ymin, ymax] = yScale.domain();

  for (const [scenario, values] of scenarios) {

    const filtered = values.filter(d => {
      const t = convertTemp(d.temp);
      return (
        d.year >= xmin &&
        d.year <= xmax &&
        t >= ymin &&
        t <= ymax
      );
    });

    if (filtered.length < 2) continue;

    const visible = d3.select(`button[data-scenario='${scenario}']`).classed("active");

    svg.append("path")
      .datum(filtered)
      .attr("class", `scenario-line line-${scenario}`)
      .attr("fill", "none")
      .attr("stroke", colorScale(scenario))
      .attr("stroke-width", 2)
      .style("opacity", visible ? 1 : 0)
      .attr("d", lineGenerator);
  }
}


//------------------------------------------------------
// Scenario Toggle Buttons
//------------------------------------------------------
function createScenarioButtons() {
  const container = d3.select("#scenario-controls");

  scenarioOrder.forEach(scenario => {
    container.append("button")
      .attr("class", "scenario-btn active")
      .attr("data-scenario", scenario)
      .style("background-color", colorScale(scenario))
      .text(scenario)
      .on("click", function () {
        const btn = d3.select(this);
        const active = btn.classed("active");

        btn.classed("active", !active);
        btn.style("opacity", active ? 0.4 : 1);

        svg.selectAll(`.line-${scenario}`)
          .style("opacity", active ? 0 : 1);
      });
  });
}


//------------------------------------------------------
// Axis Controls
//------------------------------------------------------
function setupAxisControls() {

  document.getElementById("update").addEventListener("click", () => {
    const xmin = +document.getElementById("xmin").value;
    const xmax = +document.getElementById("xmax").value;
    const ymin = +document.getElementById("ymin").value;
    const ymax = +document.getElementById("ymax").value;

    if (!isNaN(xmin) && !isNaN(xmax)) xScale.domain([xmin, xmax]);
    if (!isNaN(ymin) && !isNaN(ymax)) yScale.domain([ymin, ymax]);

    updateAxes();
    drawLines();
  });

  document.getElementById("reset").addEventListener("click", () => {
    resetAxes();
  });
}

function resetAxes() {
  // Reset domains
  xScale.domain(originalX);
  yScale.domain(originalY);

  // Reset temperature unit to Kelvin
  document.getElementById("temp-unit").value = "K";

  // Recompute y-scale domain in Kelvin
  const all = Array.from(scenarios.values()).flat();
  yScale.domain(d3.extent(all, d => convertTemp(d.temp))).nice();

  // Update chart
  updateAxes();
  drawLines();

  // Clear input boxes
  document.getElementById("xmin").value = "";
  document.getElementById("xmax").value = "";
  document.getElementById("ymin").value = "";
  document.getElementById("ymax").value = "";
}



//------------------------------------------------------
// Unit Selector
//------------------------------------------------------
function setupUnitSelector() {
  document.getElementById("temp-unit").addEventListener("change", () => {
    const all = Array.from(scenarios.values()).flat();

    yScale.domain(d3.extent(all, d => convertTemp(d.temp))).nice();

    updateAxes();
    drawLines();
  });
}


//------------------------------------------------------
// Start Visualization
//------------------------------------------------------
init();
