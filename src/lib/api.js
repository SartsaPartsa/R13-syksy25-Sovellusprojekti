// src/lib/api.js

// Достаём токен из localStorage (запасной путь)
export function getAuthToken() {
  try {
    return JSON.parse(localStorage.getItem('auth'))?.token || ''
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



