import { cookies } from 'next/headers';
import { redirect, RedirectType } from 'next/navigation';
import { createUserClient } from '@/lib/supabase-server';

export default async function SessionPage({ params }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('dr_access_token')?.value;

  if (!token) {
    redirect('/login', RedirectType.replace);
  }

  const supabase = createUserClient(token);
  const { data: session, error } = await supabase
    .from('sessions')
    .select('status')
    .eq('id', id)
    .single();

  if (error || !session) {
    redirect('/dashboard', RedirectType.replace);
  }

  const { status } = session;

  if (status === 'part1' || status === 'part2') {
    redirect(`/dashboard/sessions/${id}/analysis`, RedirectType.replace);
  }

  if (status === 'part3' || status === 'part4' || status === 'complete') {
    redirect(`/dashboard/sessions/${id}/qa`, RedirectType.replace);
  }

  // setup or processing → document upload
  redirect(`/dashboard/sessions/${id}/documents`, RedirectType.replace);
}
