import { hash, compare } from 'bcrypt'
import jwt from 'jsonwebtoken'
import {
    createUser,
    findByEmail,
    getPasswordHashById,
    updatePassword,
    deleteById,
    getProfileById,
} from '../models/userModel.js'

const { sign, verify } = jwt

// Small validators (shared inside controller)
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const isStrongPassword = (pwd) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd)

// POST /api/user/signup
export function signup(req, res, next) {
    const { user } = req.body
    if (!user?.email || !user?.password) {
        const err = new Error('Email and password are required'); err.status = 400; return next(err)
    }
    if (!isValidEmail(user.email)) {
        const err = new Error('Invalid email'); err.status = 400; return next(err)
    }
    if (!isStrongPassword(user.password)) {
        const err = new Error('Password must be at least 8 chars, include an uppercase letter and a number')
        err.status = 400; return next(err)
    }

    // hash password and insert user
    hash(user.password, 10, async (err, hashed) => {
        try {
            if (err) return next(err)
            const created = await createUser(user.email, hashed)
            res.status(201).json(created)
        } catch (e) { next(e) }
    })
}

// POST /api/user/signin
export function signin(req, res, next) {
    const { user } = req.body
    if (!user?.email || !user?.password) {
        const err = new Error('Email and password are required'); err.status = 400; return next(err)
    }

    ; (async () => {
        try {
            const dbUser = await findByEmail(user.email)
            if (!dbUser) { const e = new Error('User not found'); e.status = 404; return next(e) }

            compare(user.password, dbUser.password_hash, (err, ok) => {
                if (err) return next(err)
                if (!ok) { const e = new Error('Invalid password'); e.status = 401; return next(e) }
                const token = sign({ id: dbUser.id, email: dbUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
                res.status(200).json({ id: dbUser.id, email: dbUser.email, token })
            })
        } catch (e) { next(e) }
    })()
}

// PATCH /api/user/me/password
export async function changePassword(req, res, next) {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body || {};

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!currentPassword || !newPassword) {
        const e = new Error('currentPassword and newPassword are required');
        e.status = 400; return next(e);
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
        const e = new Error('Password must be at least 8 chars, include an uppercase letter and a number');
        e.status = 400; return next(e);
    }
    if (currentPassword === newPassword) {
        const e = new Error('New password must be different from current');
        e.status = 400; return next(e);
    }

    try {
        const pwdHash = await getPasswordHashById(userId)
        if (!pwdHash) { const e = new Error('User not found'); e.status = 404; return next(e); }

        const ok = await new Promise((resolve, reject) =>
            compare(currentPassword, pwdHash, (err, ok2) => err ? reject(err) : resolve(ok2))
        );
        if (!ok) { const e = new Error('Current password is incorrect'); e.status = 401; return next(e); }

        const hashed = await new Promise((resolve, reject) =>
            hash(newPassword, 10, (err, h) => err ? reject(err) : resolve(h))
        );

        await updatePassword(userId, hashed)

        return res.status(204).send();
    } catch (err) {
        return next(err);
    }
}

// DELETE /api/user/me
export async function deleteMe(req, res) {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    try {
        const rowCount = await deleteById(userId)
        if (rowCount === 0) return res.status(404).json({ error: 'User not found' })
        return res.status(204).send()
    } catch (e) {
        console.error('[DELETE /api/user/me] failed:', e)
        return res.status(500).json({ error: 'Failed to delete account' })
    }
}

// GET /api/user/profile
export async function profile(req, res) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await getProfileById(userId)
    if (!profile) return res.status(404).json({ error: 'User not found' })
    return res.status(200).json(profile)
}
