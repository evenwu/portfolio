console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Projects' },
  { url: 'resume/', title: 'Projects' },
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

// Load saved preference
if ("colorScheme" in localStorage) {
  document.documentElement.style.colorScheme = localStorage.colorScheme;
  select.value = localStorage.colorScheme;
}

// Listen for changes
select.addEventListener('input', (event) => {
  const value = event.target.value;

  // Apply theme
  document.documentElement.style.colorScheme = value;

  // Save preference
  localStorage.colorScheme = value;

  console.log('color scheme changed to', value);
});



