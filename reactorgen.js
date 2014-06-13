var reactorsim = require('ic2-reactor-sim');
var scoreReactor = require('./scoring');
var Mutations = require('./mutation');
var gridUtils = require('./grid');
var config = require('./genetic-config');
var makeGrid = require('./grid').makeGrid;
var weightedRand = require('./weighted-rand');
var async = require('async');
var fs = require('fs');

var reactorIdCtr = 1;

var curGeneration = 0;
var populations = {};
for(var curPop in config.populations) populations[curPop] = new GenPopulation();

function GenReactor(grid, results, score) {
	this.grid = grid;
	this.results = results;
	this.score = score;
	this.id = reactorIdCtr++;
}

function GenFamily(members, props) {
	var self = this;
	this.members = [];	// sorted from highest (at index 0) to lowest
	this.lastGenerationScoreChange = curGeneration;
	if(Array.isArray(members)) {
		members.forEach(function(m) {
			self.addMember(m, members.length);
		});
	}
	if(props) {
		for(var key in props) {
			if(props[key] !== undefined) this[key] = props[key];
		}
	}
}
GenFamily.prototype.addMember = function(member, maxMembers) {
	if(!maxMembers) maxMembers = 1000000000;
	var i;
	var oldMaxScore = this.getMaxScore();
	var firstMember = (this.members.length === 0);
	for(i = 0; i < this.members.length; ++i) {
		if(this.members[i].score <= member.score) break;
	}
	if(i < maxMembers) {
		this.members.splice(i, 0, member);
	}
	if(this.members.length > maxMembers) {
		this.members = this.members.slice(0, maxMembers);
	}
	var newMaxScore = this.getMaxScore();
	var scoreDiffThreshold = 0.00001;
	if(oldMaxScore < newMaxScore && newMaxScore - oldMaxScore >= scoreDiffThreshold && !firstMember) {
		this.lastGenerationScoreChange = curGeneration;
	}
};
GenFamily.prototype.getMaxScore = function() {
	if(!this.members.length) return 0;
	return this.members[0].score;
};
GenFamily.prototype.resortMembers = function() {
	this.members.sort(function(a, b) {
		return b.score - a.score;
	});
};

function GenFamilySet() {
	this.families = [];	// store in order from highest score to lowest score
}
GenFamilySet.prototype.addFamily = function(family) {
	this.families.push(family);
};
GenFamilySet.prototype.resortFamilies = function(maxFamilies, phaseConfig, onlySort) {
	if(!maxFamilies) maxFamilies = 1000000000;
	this.families.sort(function(a, b) {
		return b.getMaxScore() - a.getMaxScore();
	});
	if(onlySort) return;
	if(this.families.length > maxFamilies) {
		this.families = this.families.slice(0, maxFamilies);
	}
	// Check for stale pruning
	if(phaseConfig && phaseConfig.stalePruning && phaseConfig.stalePruning.pruneStaleFamilies) {
		var newFamilies = [];
		this.families.forEach(function(family, familyIdx) {
			var staleGenerations = curGeneration - family.lastGenerationScoreChange;
			if(staleGenerations > phaseConfig.stalePruning.staleGenerations && familyIdx >= phaseConfig.stalePruning.keepTopFamilies) {
				console.log('Pruning stale family');
			} else {
				newFamilies.push(family);
			}
		});
		this.families = newFamilies;
	}
};

function GenPopulation() {
	this.familySet = new GenFamilySet();
	this.curPhase = 0;
	this.curPhaseGeneration = 0;
}


function randGrid() {
	var dims = reactorsim.getDimensions(config.reactorSize);
	var comps = [];
	for(var i = 0; i < dims.width * dims.height; ++i) {
		comps.push(weightedRand(config.componentWeights));
	}
	var grid = makeGrid(dims.width, dims.height, comps);
	return grid;
}

function writeState() {
	console.log('Saving state ...');
	var obj = {
		reactorIdCtr: reactorIdCtr,
		curGeneration: curGeneration,
		populations: populations
	};
	fs.writeFileSync('./current-state.json', JSON.stringify(obj, null, 2));
	console.log('Done.');
}

function loadState(cb) {
	if(fs.existsSync('./current-state.json')) {
		var loadedPops = 0;
		var loadedFams = 0;
		var loadedMems = 0;
		console.log('Loading saved state ...');
		var state = require('./current-state.json');
		curGeneration = state.curGeneration;
		reactorIdCtr = state.reactorIdCtr;
		for(var popId in state.populations) {
			loadedPops++;
			var statePop = state.populations[popId];
			populations[popId] = new GenPopulation();
			var newPop = populations[popId];
			newPop.curPhase = statePop.curPhase;
			newPop.curPhaseGeneration = statePop.curPhaseGeneration;
			statePop.familySet.families.forEach(function(stateFam) {
				loadedFams++;
				var newFam = new GenFamily();
				newFam.lastGenerationScoreChange = stateFam.lastGenerationScoreChange;
				stateFam.members.forEach(function(stateMem) {
					var newMem = new GenReactor(makeGrid(stateMem.grid.width, stateMem.grid.height, stateMem.grid.data), stateMem.results, stateMem.score);
					newMem.id = stateMem.id;
					newFam.addMember(newMem);
					loadedMems++;
				});
				newPop.familySet.addFamily(newFam);
			});
			populations[popId] = newPop;
		}
		console.log('Loaded ' + loadedPops + ' populations, ' + loadedFams + ' families, ' + loadedMems + ' members.');
		console.log('Rescoring loaded reactors ...');
		rerunAll(cb);
	} else {
		cb();
	}
}

function rerunAll(cb) {
	async.eachSeries(Object.keys(populations), function(popId, cb) {
		var pop = populations[popId];
		async.eachSeries(pop.familySet.families, function(family, cb) {
			async.eachSeries(family.members, function(member, cb) {
				reactorsim.runSimulation(member.grid, function(error, simResults) {
					if(error) return cb(error);
					var phaseConfig = config.populations[popId].phases[pop.curPhase];
					var score = scoreReactor(phaseConfig, member.grid, simResults);
					member.results = simResults;
					member.score = score;
					cb();
				});
			}, function() {
				family.resortMembers();
				cb();
			});
		}, function() {
			pop.familySet.resortFamilies(null, null, true);
			cb();
		});
	}, function() {
		cb();
	});
}


function runGeneration(cb) {
	console.log('Generating reactors ...');
	var i;

	async.eachSeries(Object.keys(populations), function(populationId, cb) {
		console.log('Generating reactors for ' + populationId + ' ...');
		var population = populations[populationId];
		var popConfig = config.populations[populationId];
		var popPhases = popConfig.phases;

		// Check if switching to next phase
		if(population.curPhaseGeneration >= popConfig.phases[population.curPhase].numGenerations) {
			population.curPhase++;
			population.curPhaseGeneration = 0;
			if(population.curPhase >= popConfig.phases.length) population.curPhase = 0;
		}

		var phaseConfig = popConfig.phases[population.curPhase];
		var mutations = new Mutations(phaseConfig);

		var nRandFamilies = (curGeneration === 0) ? phaseConfig.algorithm.randomFamiliesInitialGeneration : phaseConfig.algorithm.randomFamiliesPerGeneration;
		var reactorsToRun = [];

		// Generate mutated reactors
		population.familySet.families.forEach(function(family) {
			family.members.forEach(function(member) {
				for(i = 0; i < phaseConfig.algorithm.offspringPerMember; ++i) {
					var newGrid = mutations.mutate(member.grid);
					reactorsToRun.push({
						family: family,
						grid: newGrid
					});
				}
			});
		});

		// Generate random families
		for(i = 0; i < nRandFamilies; ++i) {
			reactorsToRun.push({
				family: null,
				grid: randGrid()
			});
		}

		function hybridFamilyProps(fam1, fam2) {
			function min(a, b) {
				return (a < b) ? a : b;
			}
			var ret = {};
			if(phaseConfig.stalePruning && phaseConfig.stalePruning.preserveStaleCounterOnHybrid) {
				ret.lastGenerationScoreChange = min(fam1.lastGenerationScoreChange, fam2.lastGenerationScoreChange);
			}
			return ret;
		}

		// Generate same-family hybrids
		for(i = 0; i < phaseConfig.algorithm.sameFamilyHybrids; ++i) {
			var family = population.familySet.families[Math.floor(Math.random() * population.familySet.families.length)];
			if(family && family.members.length > 1) {
				var hybridMember1 = family.members[Math.floor(Math.random() * family.members.length)];
				var hybridMember2;
				do {
					hybridMember2 = family.members[Math.floor(Math.random() * family.members.length)];
				} while(hybridMember2 === hybridMember1);
				reactorsToRun.push({
					family: family,
					grid: mutations.hybrid(hybridMember1.grid, hybridMember2.grid)
				});
			}
		}

		// Generate cross-family hybrids
		for(i = 0; i < phaseConfig.algorithm.crossFamilyHybrids; ++i) {
			if(population.familySet.families.length > 1) {
				var parentFamily1 = population.familySet.families[Math.floor(Math.random() * population.familySet.families.length)];
				var parentFamily2;
				do {
					parentFamily2 = population.familySet.families[Math.floor(Math.random() * population.familySet.families.length)];
				} while(parentFamily1 === parentFamily2);
				var hybridMember1 = parentFamily1.members[Math.floor(Math.random() * parentFamily1.members.length)];
				var hybridMember2 = parentFamily2.members[Math.floor(Math.random() * parentFamily2.members.length)];
				if(hybridMember1 && hybridMember2) {
					reactorsToRun.push({
						family: null,
						grid: mutations.hybrid(hybridMember1.grid, hybridMember2.grid),
						familyProperties: hybridFamilyProps(parentFamily1, parentFamily2)
					});
				}
			}
		}

		// Generate cross-population hybrids
		for(i = 0; i < phaseConfig.algorithm.crossPopulationHybrids; ++i) {
			if(!phaseConfig.hybridization.crossPopulationHybridWeights) throw "Missing weights";
			var popId1 = weightedRand(phaseConfig.hybridization.crossPopulationHybridWeights);
			var pop1 = populations[popId1];
			var popId2 = weightedRand(phaseConfig.hybridization.crossPopulationHybridWeights);
			var pop2 = populations[popId2];
			if(popId1 == popId2 && pop1.familySet.families.length < 2) continue;
			if(pop1.familySet.families.length < 1 || pop2.familySet.families.length < 1) continue;
			var parentFamily1 = pop1.familySet.families[Math.floor(Math.random() * pop1.familySet.families.length)];
			var parentFamily2;
			do {
				parentFamily2 = pop2.familySet.families[Math.floor(Math.random() * pop2.familySet.families.length)];
			} while(popId1 === popId2 && parentFamily1 === parentFamily2);
			var hybridMember1 = parentFamily1.members[Math.floor(Math.random() * parentFamily1.members.length)];
			var hybridMember2 = parentFamily2.members[Math.floor(Math.random() * parentFamily2.members.length)];
			if(hybridMember1 && hybridMember2) {
				reactorsToRun.push({
					family: null,
					grid: mutations.hybrid(hybridMember1.grid, hybridMember2.grid),
					familyProperties: hybridFamilyProps(parentFamily1, parentFamily2)
				});
			}
		}

		// Add promoted reactors, and prune the population families
		if(phaseConfig.promotions && curGeneration % phaseConfig.promotions.promotionInterval == phaseConfig.promotions.promotionInterval - 1) {
			phaseConfig.promotions.promotedPopulations.forEach(function(promPopId) {
				var promPop = populations[promPopId];
				promPop.familySet.resortFamilies(phaseConfig.promotions.prePromotionPruneFamilies);
				promPop.familySet.families.slice(0, phaseConfig.promotions.numPromotionsPerPopulation).forEach(function(family) {
					if(family.members.length) {
						reactorsToRun.push({
							family: null,
							grid: family.members[0].grid
						});
					}
				});
			});
		}

		// Run each reactor and add the results to the state
		console.log('Running simulations (' + reactorsToRun.length + ') ...');
		async.eachLimit(reactorsToRun, 16, function(reac, cb) {
			reactorsim.runSimulation(reac.grid, function(error, simResults) {
				if(error) return cb(error);
				var score = scoreReactor(phaseConfig, reac.grid, simResults);
				var reactor = new GenReactor(reac.grid, simResults, score);
				if(reac.family) {
					reac.family.addMember(reactor, phaseConfig.algorithm.membersPerFamily);
				} else {
					population.familySet.addFamily(new GenFamily([reactor], reac.familyProperties));
				}
				cb();
			});
		}, function(error) {
			if(error) throw error;
			// Resort and truncate families
			population.familySet.resortFamilies(phaseConfig.algorithm.families, phaseConfig);
			population.curPhaseGeneration++;
			cb();
		});

	}, function() {
		curGeneration++;
		writeState();
		cb();
	});
}

function run() {
	loadState(function() {
		async.whilst(function() {
			return true;
		}, function(cb) {
			console.log('=== Running generation ' + curGeneration + ' ===');
			runGeneration(function() {
				console.log('Top Result:');
				var bestFam = populations[config.resultPopulation].familySet.families[0];
				if(bestFam) {
					var best = bestFam.members[0];
					if(best) {
						gridUtils.printGrid(best.grid);
						console.log(best.results);
					} else {
						console.log('None yet.');
					}
				} else {
					console.log('None yet.');
				}
				cb();
			});
		}, function() {
			console.log('Done.');
		});
	});
}

exports.run = run;

exports.getStatus = function() {
	return {
		curGeneration: curGeneration,
		populations: populations
	};
};


