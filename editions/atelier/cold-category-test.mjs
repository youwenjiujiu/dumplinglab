// Exercise the real catalogue-update handler without network or production writes.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('app.js',import.meta.url),'utf8');
const handler=source.match(/window\.addEventListener\('catalog-updated',[\s\S]*?\n\}\);/)[0];
let refresh,navigation=0,directory=0;
const context=vm.createContext({
 window:{addEventListener(name,callback){refresh=callback}},
 SECTIONS:['recommended','dumplings','noodles','sides','cold','drinks'],
 MENU:[{section:'sides',active:true}],categories:['recommended','sides'],activeCategory:'sides',modal:null,
 renderNavigation(){navigation++},showCategories(){directory++},renderMenu(){},renderTray(){},
});
vm.runInContext(handler,context);
context.MENU=[{section:'cold',active:true}];refresh();
assert.deepEqual([...context.categories],['recommended','cold']);
assert.equal(context.activeCategory,'recommended');assert.equal(navigation,1);
refresh();assert.equal(navigation,1,'unchanged categories preserve navigation nodes');
context.activeCategory='cold';context.modal='categories';context.MENU=[{section:'cold',active:false}];refresh();
assert.deepEqual([...context.categories],['recommended']);assert.equal(context.activeCategory,'recommended');
assert.equal(directory,1,'open category directory refreshes too');
const admin=await readFile(new URL('../../web/catalog-admin.html',import.meta.url),'utf8');
assert.equal((admin.match(/<option value="cold">凉菜<\/option>/g)||[]).length,2,'filter and editor both support cold dishes');
console.log('PASS cold category: dynamic navigation, inactive/empty category removal, active category fallback, directory refresh and admin options.');
