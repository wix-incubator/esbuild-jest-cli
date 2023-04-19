const { cyan } = require('chalk');

function hello() { return 'hello'; }
function world() { return 'world'; }

function globalize(s) { return cyan('global') + ' ' + s; }

module.exports = { hello, world, globalize };
