// Re-mounts on every route change; the .page-enter class animates a soft
// fade-in via plain CSS (see globals.css). Deliberately NOT framer-motion:
// a JS transform on this wrapper breaks position:fixed descendants (modals,
// bottom sheets), and mount-time animations can get dropped when a page
// suspends during hydration, leaving the page stuck at opacity 0.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
