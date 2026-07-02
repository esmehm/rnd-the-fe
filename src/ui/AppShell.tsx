import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as s from './AppShell.css';

// Static context stubs — the prototype runs against a debug_no_access_control backend,
// so there's no real auth/store session; these mirror the old FE's footer for parity.
const STORE_NAME = 'CHC Ermera';
const USER = 'check';
const LANG = 'English';

export function AppShell() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const inInventory = pathname.startsWith('/inventory');
  return (
    <div className={s.shell}>
      <nav className={s.sidebar} aria-label="Primary">
        <div className={s.logo} aria-hidden>
          mS
        </div>
        <NavLink to="/inventory/stocktakes" className={s.navItem} data-active={inInventory} title={t('nav.inventory')} aria-label={t('nav.inventory')}>
          📦
        </NavLink>
        <a className={s.navItem} title={t('nav.reports')} aria-label={t('nav.reports')}>
          📊
        </a>
        <div className={s.navSpacer} />
        <a className={s.navItem} title={t('nav.settings')} aria-label={t('nav.settings')}>
          ⚙️
        </a>
        <a className={s.navItem} title={t('nav.help')} aria-label={t('nav.help')}>
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
