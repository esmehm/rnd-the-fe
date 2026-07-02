import { globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css';

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' });
globalStyle('html, body, #root', { height: '100%', margin: 0 });
globalStyle('body', {
  fontFamily: vars.font.family,
  fontSize: vars.font.sizeMd,
  color: vars.color.text,
  backgroundColor: vars.color.bg,
  WebkitFontSmoothing: 'antialiased',
});
globalStyle('button, input, select, textarea', { font: 'inherit' });
globalStyle('*:focus-visible', {
  outline: `2px solid ${vars.color.focusRing}`,
  outlineOffset: '2px',
});
