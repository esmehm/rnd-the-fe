import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Matches the old FE's i18next setup. English bundle here; other locales load the
// same keys. New user-facing strings should go through t('...') (see CLAUDE.md).
// RTL is a further step (CSS logical properties + dir on <html>).
const en = {
  translation: {
    'nav.inventory': 'Inventory',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.help': 'Help',

    'stocktakes.title': 'Stocktakes',
    'stocktakes.new': '+ New stocktake',
    'stocktakes.exportCsv': 'Export CSV',
    'stocktakes.filter': 'Filter by description…',
    'stocktakes.count_one': '{{count}} stocktake',
    'stocktakes.count_other': '{{count}} stocktakes',
    'col.number': 'Number',
    'col.status': 'Status',
    'col.description': 'Description',
    'col.created': 'Created',
    'col.lines': 'Lines',

    'stocktake.title': 'Stocktake #{{number}}',
    'stocktake.addItem': '+ Add item',
    'stocktake.onHold': 'On hold',
    'stocktake.confirmFinalised': 'Confirm finalised',
    'stocktake.more': 'More',
    'stocktake.exportCsv': 'Export CSV',
    'stocktake.description': 'Description',
    'stocktake.descriptionPlaceholder': 'Add a description…',
    'stocktake.filterItems': 'Filter items by code or name…',
    'stocktake.linesCount': '{{shown}} of {{total}} lines',
    'stocktake.finalisedBanner': 'This stocktake is finalised and cannot be edited.',
    'stocktake.onHoldBanner': 'This stocktake is on hold (locked).',

    'tab.details': 'Details',
    'tab.log': 'Log',

    'common.delete': 'Delete',
    'common.deleteN': 'Delete ({{count}})',
  },
};

i18n.use(initReactI18next).init({
  resources: { en },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
