// Avoids the noisy "No route matches URL /favicon.ico" dev-server error
// that every browser's automatic favicon request otherwise triggers.
export function loader() {
  return new Response(null, { status: 204 });
}
