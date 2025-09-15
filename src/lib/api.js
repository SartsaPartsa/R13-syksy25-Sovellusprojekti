const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function buildUrl(path) {
  if (BASE && /\/api\/?$/.test(BASE) && path.startsWith('/api')) {
    return `${BASE}${path.replace(/^\/api/, '')}`
  }
  return `${BASE}${path}`
}

export async function api(path, opts = {}) {
  const res = await fetch(buildUrl(path), {
    method: 'GET',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })

  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!res.ok) {
    const err = new Error(data?.error || res.statusText)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export function getAuthToken() {
  try {
    const fromLocal = JSON.parse(localStorage.getItem('auth') || 'null')?.token
    const fromSession = JSON.parse(sessionStorage.getItem('user') || 'null')?.token
    return fromLocal || fromSession || ''
  } catch {
    return ''
  }
}
 
export async function deleteMyAccount(token) {
  const tk = token || getAuthToken()
  if (!tk) throw new Error('No token provided')

  
  const res = await fetch('/api/user/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tk}` },
  })

  if (res.status === 204) return true

  const data = await res.json().catch(() => ({}))
  throw new Error(data.error || data.message || `Failed (${res.status})`)
}

export async function changeMyPassword(currentPassword, newPassword, token) {
  const tk = token || (() => {
    try { return JSON.parse(localStorage.getItem('auth'))?.token || '' } catch { return '' }
  })();
  if (!tk) throw new Error('No token provided');

  const res = await fetch('/api/user/me/password', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tk}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (res.status === 204) return true;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || data.message || `Failed (${res.status})`);
}

// --- Groups API ---
export const GroupsAPI = {
  list: () => api('/api/groups'),
  get: (id) => api(`/api/groups/${id}`),
  create: async ({ name }) => {
    const tk = getAuthToken()
    if (!tk) throw new Error('Not authenticated')
    return api('/api/groups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ name }),
    })
  },
  members: async (groupId) => {
    const tk = getAuthToken()
    if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/members`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
  },
  approve: async (groupId, userId) => {
    const tk = getAuthToken()
    if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ action: 'approve' }),
    })
  },
  reject: async (groupId, userId) => {
    const tk = getAuthToken()
    if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ action: 'reject' }),
    })
  },
  leave: async (groupId) => {
    const tk = getAuthToken()
    if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/members/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tk}` },
    })
  },
  requestJoin: async (groupId) => {
    const tk = getAuthToken()
    if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/join`, { method: 'POST', headers: { Authorization: `Bearer ${tk}` } })
  },
  delete: async (groupId) => {
    const tk = getAuthToken(); if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk}` } })
  },
  removeMember: async (groupId, userId) => {
    const tk = getAuthToken(); if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk}` } })
  },
  myMembership: async (groupId) => {
    const tk = getAuthToken(); if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/membership/me`, { headers: { Authorization: `Bearer ${tk}` } })
  },
  movies: async (groupId) => {
    const tk = getAuthToken(); if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/movies`, { headers: { Authorization: `Bearer ${tk}` } })
  },
  addMovie: async (groupId, movie_id, title) => {
    const tk = getAuthToken(); if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/movies`, { method: 'POST', headers: { Authorization: `Bearer ${tk}` }, body: JSON.stringify({ movie_id, title }) })
  },
  deleteMovie: async (groupId, gmId) => {
    const tk = getAuthToken(); if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/movies/${gmId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk}` } })
  },
  addShowtime: async (groupId, gmId, payload) => {
    const tk = getAuthToken(); if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/movies/${gmId}/showtimes`, { method: 'POST', headers: { Authorization: `Bearer ${tk}` }, body: JSON.stringify(payload) })
  },
  deleteShowtime: async (groupId, gmId, sid) => {
    const tk = getAuthToken(); if (!tk) throw new Error('Not authenticated')
    return api(`/api/groups/${groupId}/movies/${gmId}/showtimes/${sid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk}` } })
  },
}

