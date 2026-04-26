import { fetchJSON, renderProjects, fetchGithubData } from './global.js';

const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

// --- GitHub Section ---
const githubData = await fetchGithubData('evenwu');
const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
  profileStats.innerHTML = `
    <dl>
      <dt>FOLLOWERS:</dt><dd>${githubData.followers}</dd>
      <dt>FOLLOWING:</dt><dd>${githubData.following}</dd>
      <dt>PUBLIC REPOS:</dt><dd>${githubData.public_repos}</dd>
      <dt>PUBLIC GISTS:</dt><dd>${githubData.public_gists}</dd>
    </dl>
  `;
}
