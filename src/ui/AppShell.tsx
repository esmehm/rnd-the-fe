import { NavLink, Outlet, useLocation } from 'react-router-dom';
import * as s from './AppShell.css';

// Static context stubs — the prototype runs against a debug_no_access_control backend,
// so there's no real auth/store session; these mirror the old FE's footer for parity.
const STORE_NAME = 'CHC Ermera';
const USER = 'check';
const LANG = 'English';

export function AppShell() {
  const { pathname } = useLocation();
  const inInventory = pathname.startsWith('/inventory');
  return (
    <div className={s.shell}>
      <nav className={s.sidebar} aria-label="Primary">
        <div className={s.logo} aria-hidden>
          mS
        </div>
        <NavLink to="/inventory/stocktakes" className={s.navItem} data-active={inInventory} title="Inventory" aria-label="Inventory">
          📦
        </NavLink>
        <a className={s.navItem} title="Reports (not in prototype)" aria-label="Reports">
          📊
        </a>
        <div className={s.navSpacer} />
        <a className={s.navItem} title="Settings (not in prototype)" aria-label="Settings">
          ⚙️
        </a>
        <a className={s.navItem} title="Help (not in prototype)" aria-label="Help">
          ❔
        </a>
      </nav>
      <div className={s.main}>
        <div className={s.content}>
          <Outlet />
        </div>
        <footer className={s.footer}>
          <span className={s.footerItem}>🏬 {STORE_NAME}</span>
          <span className={s.footerItem}>👤 {USER}</span>
          <span className={s.footerItem}>🌐 {LANG}</span>
        </footer>
      </div>
    </div>
  );
}
