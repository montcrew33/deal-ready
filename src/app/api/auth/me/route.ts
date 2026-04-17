import { NextRequest } from 'next/server';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return unauthorizedResponse();
  }

  return Response.json({ user: { id: user.id, email: user.email } });
}
