import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { comparePassword, hashPassword, signToken, getCurrentUser } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET: Check current authenticated user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}

// POST: Login, Register, or Logout
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, fullName } = body;
    const db = getDb();
    const cookieStore = await cookies();

    if (action === 'logout') {
      cookieStore.delete('helpot_session');
      return NextResponse.json({ success: true, message: 'Déconnexion réussie' });
    }

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
      if (!user) {
        return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
      }

      const isValid = comparePassword(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
      }

      const authUser = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      };

      const token = signToken(authUser);
      cookieStore.set('helpot_session', token, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return NextResponse.json({ success: true, user: authUser });
    }

    if (action === 'register') {
      if (!email || !password || !fullName) {
        return NextResponse.json({ error: 'Tous les champs sont obligatoires' }, { status: 400 });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
      if (existing) {
        return NextResponse.json({ error: 'Un compte existe déjà avec cette adresse email' }, { status: 409 });
      }

      const newUserId = `user-${Date.now()}`;
      const hashedPassword = hashPassword(password);

      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, 'CLIENT')
      `).run(newUserId, email.toLowerCase().trim(), hashedPassword, fullName);

      const authUser = {
        id: newUserId,
        email: email.toLowerCase().trim(),
        fullName,
        role: 'CLIENT' as const
      };

      const token = signToken(authUser);
      cookieStore.set('helpot_session', token, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
      });

      return NextResponse.json({ success: true, user: authUser }, { status: 201 });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
