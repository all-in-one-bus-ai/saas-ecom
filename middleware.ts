import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/(auth)') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';

  const isSaasRoute = pathname.startsWith('/saas');
  const isStoreAdminRoute = pathname.includes('/admin');
  const isManagerRoute = pathname.includes('/manager');
  const isOperativeRoute = pathname.includes('/operative');
  const isProtectedRoute = isSaasRoute || isStoreAdminRoute || isManagerRoute || isOperativeRoute;

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('system_role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.system_role === 'super_admin') {
      return NextResponse.redirect(new URL('/saas', request.url));
    }

    const { data: memberships } = await supabase
      .from('tenant_memberships')
      .select('tenant_id, role, tenants!inner(slug)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (memberships && memberships.length > 0) {
      const m = memberships[0] as unknown as { tenant_id: string; role: string; tenants: { slug: string } };
      const slug = m.tenants.slug;
      const role = m.role;
      if (role === 'store_admin') {
        return NextResponse.redirect(new URL(`/store/${slug}/admin`, request.url));
      } else if (role === 'manager') {
        return NextResponse.redirect(new URL(`/store/${slug}/manager`, request.url));
      } else {
        return NextResponse.redirect(new URL(`/store/${slug}/operative`, request.url));
      }
    }
  }

  if (isSaasRoute && user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('system_role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.system_role !== 'super_admin') {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
