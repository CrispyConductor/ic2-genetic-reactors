var express = require('express');
var bodyParser = require('body-parser');
var reactorgen = require('./reactorgen');
var cors = require('cors');

var app = express();

app.use(cors());
app.use(bodyParser());

app.use('/static', express.static('./static'));

app.get('/status', function(req, res) {
	res.set('Content-type', 'application/json');
	res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
	res.set('Expires', '-1');
	res.set('Pragma', 'no-cache');
	if(!req.body) req.body = {};
	var topFamilies = parseInt(req.body.topFamilies || req.query.topFamilies || 3);
	var topMembers = parseInt(req.body.topMembers || req.query.topMembers || 3);
	var status = reactorgen.getStatus();
	var ret = {
		curGeneration: status.curGeneration,
		populations: {}
	};
	for(var popId in status.populations) {
		var pop = status.populations[popId];
		ret.populations[popId] = {
			families: pop.familySet.families.slice(0, topFamilies).map(function(fam) {
				return {
					lastGenerationScoreChange: fam.lastGenerationScoreChange,
					members: fam.members.slice(0, topMembers).map(function(mem) {
						return {
							grid: mem.grid,
							results: mem.results,
							score: mem.score,
							id: mem.id
						};
					})
				};
			})
		};
	}
	res.send(JSON.stringify(ret));
});

reactorgen.run();

app.listen(3005, function() {
	console.log('Listening.');
});
