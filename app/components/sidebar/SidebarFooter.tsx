/** Logo on the left, name + tagline stacked on the right, vertically
 * centered. Hover only ever adds a subtle background — opacity, visibility
 * and layout are pinned so nothing can fade, hide, or shift. */
export function SidebarFooter() {
  return (
    <div className="mango-sidebar-footer">
      <img
        src="/footer-logo.png"
        alt=""
        width={34}
        height={34}
        className="mango-sidebar-footer__logo"
      />
      <div className="mango-sidebar-footer__text">
        <span className="mango-sidebar-footer__name">Mango Product Feed</span>
        <span className="mango-sidebar-footer__tagline">
          Built by Nextup Global, LLC for merchants.
        </span>
      </div>
    </div>
  );
}
