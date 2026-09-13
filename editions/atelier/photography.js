// Presentation-only mappings from the owner's September 2026 shoot.
// No SKU, recipe, portion or pricing changes. Ambiguous fillings stay unmapped.
(() => {
  const dishes = {
    'lunch-v4-red-oil-chaoshou': '0752',
    'lunch-v2-mince-scallion-noodles': '0893',
    'lunch-v2-chicken-wings': '0955',
    'lunch-v2-pork-cutlet': '0980',
    'lunch-v2-cold-veg-shreds': '1036',
    'lunch-v2-choy-sum': '1044',
    'lunch-v2-oyster-lettuce': '1048',
    'lunch-v2-braised-tofu': '1060',
    'lunch-v2-pork-rice': '1084',
    'lunch-v2-century-egg-noodles': '1163',
  };
  // The owner prefers the original four preparation illustrations.
  const preparations = {};
  const recommendations = { 'red-oil-chaoshou': '0752', 'boiled-dumplings': '0852' };
  const shots = ['0752','0754','0764','0778','0783','0811','0815','0820','0826','0849','0852','0865','0893','0899','0901','0916','0918','0927','0933','0955','0961','0975','0980','0983','0998','1009','1012','1019','1029','1036','1044','1048','1052','1060','1066','1072','1084','1111','1123','1146','1163'];
  const file = id => `shoot-20260908-${id}.webp`;
  const cutouts = ['0752','0852','0893','0955','0980','1036','1044','1048','1060','1084','1163'];
  const menuFile = id => cutouts.includes(id) ? `shoot-20260908-${id}-cutout.webp` : file(id);
  globalThis.DL_PHOTOGRAPHY = Object.freeze({ dishes, preparations, recommendations, shots, file, menuFile, cutouts });
  for (const [records, mapping] of [[globalThis.MENU,dishes],[globalThis.LUNCH_PREPARATIONS,preparations],[globalThis.LUNCH_RECOMMENDATIONS,recommendations]]) {
    for (const item of records || []) if (mapping[item.id]) {
      item.img = menuFile(mapping[item.id]);
      item.photography = { source:'owner-shoot-20260908', number:mapping[item.id], match:'visual-review' };
    }
  }
})();
