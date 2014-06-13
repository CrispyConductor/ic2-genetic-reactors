var config = require('./genetic-config');

function calculateCost(grid, costs) {
	var cost = 0;
	for(var i = 0; i < grid.length; ++i) {
		if(costs[grid[i]]) {
			cost += costs[grid[i]];
		}
	}
	return cost;
}

function countComponents(grid) {
	var counts = {};
	for(var i = 0; i < grid.length; ++i) {
		var c = grid[i];
		if(!counts[c]) counts[c] = 0;
		counts[c]++;
	}
	return counts;
}

function objScore(obj, scoring) {
	var score = 0;
	for(var key in scoring) {
		var spec = scoring[key];
		var val = obj[key];
		if(spec.factor) {
			if(typeof val == 'number' && val !== -1) {
				score += spec.factor * val;
			}
		}
		if(spec.values) {
			var valStr;
			if(val === true) valStr = 'true';
			else if(val === false) valStr = 'false';
			else if(val === null || val === undefined) valStr = 'null';
			else valStr = '' + val;
			if(spec.values[valStr]) {
				score += spec.values[valStr];
			}
		}
		if(spec.threshold) {
			if(spec.threshold.ifEmpty && (val == 0 || val == -1)) {
				score += spec.threshold.ifEmpty;
			} else if(val >= spec.threshold.value) {
				score += spec.threshold.score;
			}
		}
		if(spec.logFactor) {
			score += (Math.log(val + 1) / Math.log(spec.logBase || 10) + (spec.logOffset)) * spec.logFactor;
		}
	}
	return score;
}

function scoreReactor(phaseConfig, grid, simResults) {
	// Calculate real costs
	simResults.totalCost = calculateCost(grid, config.componentCosts);
	simResults.consumableCost = calculateCost(grid, config.consumableCosts);

	// Calculate component counts
	var counts = countComponents(grid);
	for(var key in counts) {
		simResults['count' + key] = counts[key];
	}

	// Calculate unused columns
	var x, y;
	var unusedColumns = 0;
	for(x = grid.width - 1; x >= 0; x--) {
		var hasItems = false;
		for(y = 0; y < grid.height; y++) {
			if(grid.get(x, y) != 'XX') {
				hasItems = true;
			}
		}
		if(hasItems) break;
		else unusedColumns++;
	}
	simResults.unusedColumns = unusedColumns;

	// Calculate ticks until failure
	simResults.ticksUntilFailure = simResults.ticksUntilComponentFailure;
	if(simResults.ticksUntilMeltdown >= 0 && (simResults.ticksUntilMeltdown < simResults.ticksUntilComponentFailure || simResults.ticksUntilComponentFailure < 0)) {
		simResults.ticksUntilFailure = simResults.ticksUntilMeltdown;
	}

	// Score the result
	return objScore(simResults, phaseConfig.scoring);
}

module.exports = scoreReactor;
