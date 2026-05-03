import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const titleElement = document.querySelector('.projects-title');
if (titleElement) {
  titleElement.textContent = `${projects.length} Projects`;
}

let rolledData = d3.rollups(
  projects,
  v => v.length,     // count projects in each year
  d => d.year        // group by year
);

let data = rolledData.map(([year, count]) => {
  return {
    value: count,
    label: year
  };
});


// Create an arc generator for a full circle
const arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(50);

let sliceGenerator = d3.pie().value((d) => d.value);
let arcData = sliceGenerator(data);
let arcs = arcData.map((d) => arcGenerator(d));
let colors = d3.scaleOrdinal(d3.schemeTableau10);

arcs.forEach((arc, idx) => {
  d3.select('svg')
    .append("path")
    .attr("d", arc)
    .attr("fill", colors(idx));
});

let legend = d3.select('.legend');

data.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color: ${colors(idx)}`)
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});

let query = "";
let searchInput = document.querySelector(".searchBar");

function filterProjects(projects, query) {
  let q = query.toLowerCase();

  return projects.filter(project => {
    let values = Object.values(project).join("\n").toLowerCase();
    return values.includes(q);
  });
}

searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  let filtered = filterProjects(projects, query);

  renderProjects(filtered, projectsContainer, "h2");
  renderPieChart(filtered);
});

function renderPieChart(projectsGiven) {
  // 1. Clear old SVG paths
  let svg = d3.select("#projects-pie-plot");
  svg.selectAll("path").remove();

  // 2. Clear old legend items
  let legend = d3.select(".legend");
  legend.selectAll("li").remove();

  // 3. Recompute rolled data
  let rolled = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  // 4. Convert to {label, value}
  let data = rolled.map(([year, count]) => ({
    label: year,
    value: count
  }));

  // 5. Slice + arc generators
  let slice = d3.pie().value(d => d.value);
  let arcData = slice(data);

  let arc = d3.arc().innerRadius(0).outerRadius(50);
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  // 6. Draw slices
  svg.selectAll("path")
    .data(arcData)
    .join("path")
    .attr("d", arc)
    .attr("fill", (d, i) => colors(i));

  // 7. Draw legend (THIS is where your circles disappeared)
  data.forEach((d, i) => {
    legend.append("li")
      .attr("style", `--color: ${colors(i)}`)   // REQUIRED for circles to show
      .html(`
        <div class="color-box"></div>
        <span class="swatch"></span><span>${d.label} (${d.value})</span>
      `);
  });
}

let selectedIndex = -1;
let currentPieData = data;

let svg = d3.select('svg');
svg.selectAll('path').remove();
arcs.forEach((arc, i) => {
  svg
    .append('path')
    .attr('d', arc)
    .attr('fill', colors(i))
    .on('click', () => {
      selectedIndex = selectedIndex === i ? -1 : i;

      svg
        .selectAll('path')
        .attr('class', (_, idx) => (
          idx === selectedIndex ? 'selected' : ''
        ));
      legend
        .selectAll('li')
        .attr('class', (_, idx) => (
          idx === selectedIndex ? 'selected' : ''
        ));

      if (selectedIndex === -1) {
        renderProjects(projects, projectsContainer, 'h2');
      } else {
        let selectedYear = currentPieData[selectedIndex].label;

        let filtered = projects.filter(p => p.year === selectedYear);

        renderProjects(filtered, projectsContainer, 'h2');
      }

    });
});

