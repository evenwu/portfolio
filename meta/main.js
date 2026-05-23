import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale;
let commitProgress = 100;
let timeScale;
let commitMaxTime;
let filteredCommits;

let colors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, d => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: "https://github.com/evenwu/portfolio/commit/" + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length
      };

      Object.defineProperty(ret, "lines", {
        value: lines,
        enumerable: false,   // hides it from console.log
        writable: false,
        configurable: false
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats")
    .append("dl")
    .attr("class", "stats");

  // Total LOC
  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").text(data.length);

  // Total commits
  dl.append("dt").text("Commits");
  dl.append("dd").text(commits.length);

  // Maximum depth
  dl.append("dt").text("MAX depth");
  dl.append("dd").text(d3.max(data, d => d.depth));

  // Average line length
  dl.append("dt").text("AVG line length");
  dl.append("dd").text(d3.mean(data, d => d.length).toFixed(2));

  // Number of files
  dl.append("dt").text("Files");
  dl.append("dd").text(d3.group(data, d => d.file).size);
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  const minDate = d3.min(commits, d => d.datetime);
  const maxDate = d3.max(commits, d => d.datetime);

  xScale = d3
    .scaleTime()
    .domain([minDate, maxDate])
    .range([0, width])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([height, 0]);

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  const xAxis = d3.axisBottom(xScale);

  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, "0") + ":00");

  svg.append("g")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .attr("class", "x-axis")
    .call(xAxis);

  svg.append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .attr("class", "y-axis")
    .call(yAxis);

  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  
  const rScale = d3.scaleSqrt()
  .domain([minLines, maxLines])
  .range([2, 30]);

  const dots = svg.append("g").attr("class", "dots");

  dots
    .selectAll("circle")
    .data(sortedCommits, d => d.id)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, d) => {
      renderTooltipContent(d);
      updateTooltipVisibility(true)
      updateTooltipPosition(event)
    })
    .on("mouseleave", (event, d) => {
      updateTooltipVisibility(false)
    });

  svg.call(
    d3.brush().on("start brush end", brushed)
  );


  // Raise dots and everything after overlay
  svg.selectAll(".dots, .overlay ~ *").raise();

}

function renderTooltipContent(commit) {
  if (!commit) return;

  document.getElementById("commit-link").href = commit.url;
  document.getElementById("commit-link").textContent = commit.id;

  document.getElementById("commit-date").textContent =
    commit.datetime.toLocaleString("en", { dateStyle: "full" });

  document.getElementById("commit-time-tooltip").textContent =
    commit.datetime.toLocaleString("en", { timeStyle: "short" });

  document.getElementById("commit-author").textContent = commit.author;

  document.getElementById("commit-lines").textContent =
    commit.totalLines + " lines";
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");

  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
}

function createBrushSelector(svg) {
  svg.call(d3.brush());
}

function brushed(event) {
  const selection = event.selection;

  d3.selectAll("circle")
    .classed("selected", d => isCommitSelected(selection, d));

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  const [[x0, y0], [x1, y1]] = selection;

  const cx = xScale(commit.datetime);
  const cy = yScale(commit.hourFrac);

  return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  const svg = d3.select("#chart").select("svg");

  // UPDATE X SCALE
  xScale = xScale.domain(d3.extent(commits, d => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  // EXACT LAB FIX: clear old axis
  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.selectAll("*").remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select("g.dots");

  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  dots
    .selectAll("circle")
    .data(sortedCommits, d => d.id)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });
}

function onTimeSliderChange() {
  const slider = document.getElementById("commit-progress");
  commitProgress = Number(slider.value);

  commitMaxTime = timeScale.invert(commitProgress);

  document.getElementById("commit-time").textContent =
    commitMaxTime.toLocaleString("en", {
      dateStyle: "long",
      timeStyle: "short"
    });

  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

function updateFileDisplay(filteredCommits) {
  // 1. Collect all lines from filtered commits
  let lines = filteredCommits.flatMap(d => d.lines);

  // 2. Group lines by file
  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => d3.descending(a.lines.length, b.lines.length));


  // 3. Bind to <div> elements inside #files
  let filesContainer = d3.select("#files")
    .selectAll("div")
    .data(files, d => d.name)
    .join(
      enter => enter.append("div").call(div => {
        div.append("dt").append("code");
        div.append("dd");
      })
    );

  // 4. Update filename + line count
  filesContainer.select("dt > code")
    .html(d => `${d.name}<br><small>${d.lines.length} lines</small>`);


  filesContainer
    .select("dd")
    .selectAll("div")
    .data(d => d.lines)
    .join("div")
    .attr("class", "loc")
    .attr('style', (d) => `--color: ${colors(d.type)}`);

}




let data = await loadData();

let commits = processCommits(data);
commits = d3.sort(commits, d => d.datetime);



timeScale = d3.scaleTime()
  .domain([
    d3.min(commits, d => d.datetime),
    d3.max(commits, d => d.datetime)
  ])
  .range([0, 100]);

commitMaxTime = timeScale.invert(commitProgress);
filteredCommits = commits;



renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
updateFileDisplay(filteredCommits);

document.getElementById("commit-progress")
  .addEventListener("input", onTimeSliderChange);

onTimeSliderChange(); // initialize time display

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );


function onStepEnter(response) {
  const commit = response.element.__data__;
  const date = commit.datetime;

  // Update commitMaxTime to this commit's date
  commitMaxTime = date;

  // Filter commits up to this date
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  // Update scatter plot
  updateScatterPlot(data, filteredCommits);

  // Update slider UI (optional but nice)
  const slider = document.getElementById("commit-progress");
  slider.value = timeScale(commitMaxTime);
  document.getElementById("commit-time").textContent =
    commitMaxTime.toLocaleString("en", {
      dateStyle: "long",
      timeStyle: "short"
    });
}

const scroller = scrollama();

scroller
  .setup({
    container: "#scrolly-1",
    step: "#scrolly-1 .step",
  })
  .onStepEnter(onStepEnter);
