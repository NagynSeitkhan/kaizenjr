import { NextResponse } from "next/server";

// A redirect from a POST handler defaults to 307 (Temporary Redirect) if no
// status is given, which per HTTP spec preserves the original request
// method - so the browser re-POSTs to the redirect target instead of
// GETting it. For a plain page route (no Server Action there), Next.js's
// App Router then can't find a matching action and throws "Failed to find
// Server Action". 303 (See Other) is the correct status for a "form action
// finished, now go view this page" redirect: it always forces a GET.
export function redirectAfterAction(url: string | URL): NextResponse {
  return NextResponse.redirect(url, 303);
}
