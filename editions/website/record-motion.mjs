// Desktop native-resolution capture; refuses to overwrite an existing film.
process.argv.push('--desktop');
await import('./record-native.mjs');
