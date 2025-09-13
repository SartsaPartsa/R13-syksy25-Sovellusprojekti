// src/lib/api.js

// Достаём токен из localStorage (запасной путь)
export function getAuthToken() {
  try {
    return JSON.parse(localStorage.getItem('auth'))?.token || ''
  } catch {
    return ''
  }
}

/**
 * Удалить текущего пользователя
 * Будет использовать переданный token, а если не передали — возьмёт из localStorage.
 */
export async function deleteMyAccount(token) {
  const tk = token || getAuthToken()
  if (!tk) throw new Error('No token provided')

  // ВАЖНО: у тебя префикс SINGULAR — /api/user/me (не /api/users/me)
  const res = await fetch('/api/user/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tk}` },
  })

  if (res.status === 204) return true

  const data = await res.json().catch(() => ({}))
  throw new Error(data.error || data.message || `Failed (${res.status})`)
}

// (опционально) сюда же можно добавить login/signup,
// чтобы все запросы к бэку были в одном месте.
