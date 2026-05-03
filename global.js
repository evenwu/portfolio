console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/evenwu', title: 'GitHub' }
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/portfolio/";


for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a);

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  if (a.host !== location.host) {
    a.target = '_blank';
  }
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
    <label class="color-scheme">
        Theme:
        <select id="theme-select">
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>`,
);

const select = document.querySelector('.color-scheme select');

if ("colorScheme" in localStorage) {
  document.documentElement.style.colorScheme = localStorage.colorScheme;
  select.value = localStorage.colorScheme;
}

select.addEventListener('input', (event) => {
  const value = event.target.value;

  document.documentElement.style.colorScheme = value;

  localStorage.colorScheme = value;

  console.log('color scheme changed to', value);
});

let form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
    event.preventDefault();

    let data = new FormData(form);

    let url = form.action + "?";

    let subject = encodeURIComponent(data.get("subject"));
    let message = encodeURIComponent(data.get("message"));

    url += `subject=${subject}&body=${message}`;

    location.href = url;
});

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);

    // Check for HTTP errors
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    // Parse JSON
    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    console.error('renderProjects: containerElement is null or undefined.');
    return;
  }

  containerElement.innerHTML = '';

  projects.forEach(project => {
    const article = document.createElement('article');

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
      <p class="project-year">${project.year}</p>
    `;

    containerElement.appendChild(article);
  });
}

export async function fetchGithubData(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching GitHub data:', error);
  }
}


