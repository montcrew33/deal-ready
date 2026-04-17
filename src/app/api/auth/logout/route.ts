import { NextRequest } from 'next/server';
import { getAuthUser, auditLog } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);

  if (user) {
    await auditLog(user.id, null, 'logout', {});
  }

  const expiredCookie = 'HttpOnly; Path=/; SameSite=Strict; Max-Age=0';
  const response = Response.json({ message: 'Logged out' });

  response.headers.append('Set-Cookie', `dr_access_token=; ${expiredCookie}`);
  response.headers.append('Set-Cookie', `dr_refresh_token=; ${expiredCookie}`);

  return response;
}
