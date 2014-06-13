var reactorsim = require('ic2-reactor-sim');
var gridUtils = require('./grid');
var fs = require('fs');

if(process.argv.length != 3) {
	console.log('Invalid args');
	process.exit();
}

var fn = process.argv[2];
var grid = gridUtils.loadGrid(fn);
reactorsim.runSimulation(grid, function(e, r) {
	if(e) console.log(e);
	else console.log(r);
	process.exit();
});


