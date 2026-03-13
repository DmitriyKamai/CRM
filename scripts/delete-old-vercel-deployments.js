/**
 * Удаляет все деплои Vercel, кроме созданных сегодня (по UTC).
 *
 * Токен: .env.local — VERCEL_TOKEN=xxx (Vercel → Account → Access Tokens).
 * Если проект в команде: добавьте VERCEL_TEAM_ID=team_xxx (Vercel → Team → Settings → General).
 * Другой проект: VERCEL_PROJECT_ID=имя-проекта (по умолчанию psychologist-crm).
 *
 * Использование:
 *   npm run vercel:delete-old
 *   npm run vercel:delete-old -- --dry-run   # только показать, не удалять
 */
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const DRY_RUN = process.argv.includes('--dry-run');

const VERCEL_API = 'https://api.vercel.com';

function getEnv(name, defaultValue) {
  const v = process.env[name];
  if (v != null && v !== '') return v;
  return defaultValue;
}

async function api(token, path, options = {}) {
  const url = path.startsWith('http') ? path : `${VERCEL_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel API ${res.status}: ${text}`);
  }
  return res.json();
}

function startOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

async function getProjectId(token, slug, teamId) {
  const q = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const project = await api(token, `/v9/projects/${encodeURIComponent(slug)}${q}`);
  return project.id || project.projectId || slug;
}

async function listAllDeployments(token, projectId, teamId) {
  const deployments = [];
  let until;
  let list;
  const params = new URLSearchParams({ projectId });
  if (teamId) params.set('teamId', teamId);

  do {
    if (until) params.set('until', until);
    const data = await api(token, `/v6/deployments?${params}`);
    list = data.deployments ?? [];
    deployments.push(...list);
    until = list.length ? list[list.length - 1].created : null;
  } while (until != null && list.length === 20);

  return deployments;
}

async function main() {
  const token = getEnv('VERCEL_TOKEN', process.env.TOKEN);
  if (!token) {
    console.error('Задайте VERCEL_TOKEN (или TOKEN).');
    process.exit(1);
  }

  const projectSlug = getEnv('VERCEL_PROJECT_ID', 'psychologist-crm');
  const teamId = getEnv('VERCEL_TEAM_ID', '');

  let projectId = projectSlug;
  try {
    projectId = await getProjectId(token, projectSlug, teamId);
  } catch (e) {
    if (e.message.includes('404') || e.message.includes('not_found')) {
      console.error('Проект не найден. Если он в команде Vercel, добавьте в .env.local:');
      console.error('  VERCEL_TEAM_ID=team_xxx  (Vercel → Team → Settings → General)');
      console.error('Текущие: VERCEL_PROJECT_ID=' + projectSlug + (teamId ? ', VERCEL_TEAM_ID=' + teamId : ' (команда не задана)'));
    }
    console.error('Ошибка:', e.message);
    process.exit(1);
  }

  const todayStart = startOfTodayUTC();
  console.log('Оставляем деплои с', new Date(todayStart).toISOString(), 'и позже (UTC).\n');

  let deployments;
  try {
    deployments = await listAllDeployments(token, projectId, teamId);
  } catch (e) {
    console.error('Не удалось получить список деплоев:', e.message);
    process.exit(1);
  }

  const toDelete = deployments.filter((d) => (d.created ?? 0) < todayStart);
  const toKeep = deployments.filter((d) => (d.created ?? 0) >= todayStart);

  console.log('Всего деплоев:', deployments.length);
  console.log('Оставляем (сегодня):', toKeep.length);
  console.log('Удаляем:', toDelete.length);

  if (toDelete.length === 0) {
    console.log('Нечего удалять.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n[--dry-run] Будут удалены:');
    toDelete.forEach((d) => {
      const created = d.created ? new Date(d.created).toISOString() : '?';
      console.log('  ', d.uid || d.id, created);
    });
    console.log('\nЗапустите без --dry-run, чтобы удалить.');
    return;
  }

  for (const d of toDelete) {
    const id = d.uid || d.id;
    const created = d.created ? new Date(d.created).toISOString() : '?';
    try {
      await api(token, `/v13/deployments/${id}`, { method: 'DELETE' });
      console.log('Удалён:', id, created);
    } catch (e) {
      console.error('Ошибка удаления', id, ':', e.message);
    }
  }

  console.log('\nГотово.');
}

main();
