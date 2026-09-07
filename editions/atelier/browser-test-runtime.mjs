// Test-only browser selection. Never connected to a personal browser profile.
import {chromium,webkit} from 'playwright';
export const browserEngine=process.env.ATELIER_BROWSER || 'chrome';
if(!['chrome','webkit'].includes(browserEngine))throw Error(`Unsupported test browser: ${browserEngine}`);
export const launchBrowser=()=>browserEngine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'});
