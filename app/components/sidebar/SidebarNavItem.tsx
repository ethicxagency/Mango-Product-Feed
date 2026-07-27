import { Icon } from "@shopify/polaris";
import type { IconSource } from "@shopify/polaris";
import { Link } from "@remix-run/react";

interface SidebarNavItemProps {
  url: string;
  label: string;
  icon: IconSource;
  selected: boolean;
}

export function SidebarNavItem({
  url,
  label,
  icon,
  selected,
}: SidebarNavItemProps) {
  return (
    <Link
      to={url}
      className={
        selected ? "mango-nav-item mango-nav-item--active" : "mango-nav-item"
      }
      aria-current={selected ? "page" : undefined}
    >
      <span className="mango-nav-item__icon">
        <Icon source={icon} tone={selected ? "base" : "subdued"} />
      </span>
      <span className="mango-nav-item__label">{label}</span>
    </Link>
  );
}
