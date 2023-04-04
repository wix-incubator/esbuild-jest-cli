function hello() { return 'hello'; }
function world() { return 'world'; }

function globalize(s) { return 'global ' + s; }

module.exports = { hello, world, globalize };
