/**
 * Layout Index Route - Redirects to dashboard
 * This handles the root path when using the layout
 */

import { redirect } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  // Redirect root layout path to dashboard
  return redirect('/dashboard');
}

// This component won't render due to the redirect
export default function LayoutIndex() {
  return null;
}