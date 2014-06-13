var config = require('./genetic-config');
var weightedRand = require('./weighted-rand');
var reactorsim = require('ic2-reactor-sim');
var makeGrid = require('./grid').makeGrid;

function Mutations(phaseConfig) {
	this.phaseConfig = phaseConfig;

	var componentWeights = {};
	var t;
	for(t in config.componentWeights) {
		componentWeights[t] = config.componentWeights[t];
	}
	if(this.phaseConfig.componentWeights) {
		for(t in this.phaseConfig.componentWeights) {
			componentWeights[t] = this.phaseConfig.componentWeights[t];
		}
	}
	this.componentWeights = componentWeights;

	var groupWeightsByComponent = {};
	config.componentGroups.forEach(function(group) {
		var groupWeights = {};
		group.forEach(function(comp) {
			if(componentWeights[comp]) {
				groupWeights[comp] = componentWeights[comp];
			}
		});
		if(Object.keys(groupWeights).length > 1) {
			group.forEach(function(comp) {
				var compWeights = {};
				for(var key in groupWeights) {
					if(key != comp) {
						compWeights[key] = groupWeights[key];
					}
				}
				groupWeightsByComponent[comp] = compWeights;
			});
		}
	});
	this.groupWeightsByComponent = groupWeightsByComponent;
	this.dimensions = reactorsim.getDimensions(config.reactorSize);
}

/***** Component Mutations *****/

Mutations.prototype.randomizeComponent = function(curComponent) {
	var newComp;
	while(!newComp || newComp == curComponent) {
		newComp = weightedRand(this.componentWeights);
	}
	return newComp;
};

Mutations.prototype.randomizeComponentType = function(curComponent) {
	var w = this.groupWeightsByComponent[curComponent];
	if(!w) return null;
	return weightedRand(w);
};

Mutations.prototype.removeComponent = function(curComponent) {
	if(curComponent == 'XX') return null;
	return 'XX';
};

/***** Overall Mutations *****/

Mutations.prototype.shiftGrid = function(grid) {
	var r = Math.floor(Math.random() * 4);
	var x, y;
	var w = grid.width;
	var h = grid.height;
	if(r === 0) {
		// Shift up
		for(x = 0; x < w; ++x) {
			for(y = 0; y < h - 1; ++y) {
				grid.set(x, y, grid.get(x, y + 1));
			}
			grid.set(x, h - 1, 'XX');
		}
	} else if(r === 1) {
		// Shift down
		for(x = 0; x < w; ++x) {
			for(y = h - 1; y > 0; --y) {
				grid.set(x, y, grid.get(x, y - 1));
			}
			grid.set(x, 0, 'XX');
		}
	} else if(r === 2) {
		// Shift left
		for(y = 0; y < h; ++y) {
			for(x = 0; x < w - 1; ++x) {
				grid.set(x, y, grid.get(x + 1, y));
			}
			grid.set(w - 1, y, 'XX');
		}
	} else if(r === 3) {
		// Shift right
		for(y = 0; y < h; ++y) {
			for(x = w - 1; x > 0; --x) {
				grid.set(x, y, grid.get(x - 1, y));
			}
			grid.set(0, y, 'XX');
		}
	}
	return true;
};

Mutations.prototype.rotateGrid = function(grid) {
	var r = Math.floor(Math.random() * 4);
	var x, y;
	var w = grid.width;
	var h = grid.height;
	var tmp;
	if(r === 0) {
		// Shift up
		for(x = 0; x < w; ++x) {
			tmp = grid.get(x, 0);
			for(y = 0; y < h - 1; ++y) {
				grid.set(x, y, grid.get(x, y + 1));
			}
			grid.set(x, h - 1, tmp);
		}
	} else if(r === 1) {
		// Shift down
		for(x = 0; x < w; ++x) {
			tmp = grid.get(x, h - 1);
			for(y = h - 1; y > 0; --y) {
				grid.set(x, y, grid.get(x, y - 1));
			}
			grid.set(x, 0, tmp);
		}
	} else if(r === 2) {
		// Shift left
		for(y = 0; y < h; ++y) {
			tmp = grid.get(0, y);
			for(x = 0; x < w - 1; ++x) {
				grid.set(x, y, grid.get(x + 1, y));
			}
			grid.set(w - 1, y, tmp);
		}
	} else if(r === 3) {
		// Shift right
		for(y = 0; y < h; ++y) {
			tmp = grid.get(w - 1, y);
			for(x = w - 1; x > 0; --x) {
				grid.set(x, y, grid.get(x - 1, y));
			}
			grid.set(0, y, tmp);
		}
	}
	return true;
};

Mutations.prototype.scrambleArea = function(grid, x, y, w, h) {
	var cells = w * h;
	var iterations = cells * 2;
	var cx1, cy1, cx2, cy2, tmp;
	for(var i = 0; i < iterations; ++i) {
		cx1 = Math.floor(Math.random() * w) + x;
		cx2 = Math.floor(Math.random() * w) + x;
		cy1 = Math.floor(Math.random() * h) + y;
		cy2 = Math.floor(Math.random() * h) + y;
		tmp = grid.get(cx1, cy1);
		grid.set(cx1, cy1, grid.get(cx2, cy2));
		grid.set(cx2, cy2, tmp);
	}
	return true;
};

Mutations.prototype.getRandArea = function(grid, maxW, maxH, minW, minH, maxCells, minCells) {
	if(!maxW) maxW = grid.width;
	if(!maxH) maxH = grid.height;
	if(!minW) minW = 1;
	if(!minH) minH = 1;
	if(!maxCells) maxCells = grid.width * grid.height;
	if(!minCells) minCells = 4;
	if(minCells > maxW * maxH) minCells = maxW * maxH;
	function min(a, b) { return (a > b) ? b : a; }
	for(;;) {
		var x = Math.floor(Math.random() * (maxW - minW + 1));
		var y = Math.floor(Math.random() * (maxH - minH + 1));
		var w = Math.floor(Math.random() * min(grid.width - x - minW + 1, maxW - minW + 1)) + minW;
		var h = Math.floor(Math.random() * min(grid.height - y - minH + 1, maxH - minH + 1)) + minH;
		if(w*h >= minCells && w*h <= maxCells && w <= maxW && h <= maxH && w >= minW && h >= minH) {
			return { x: x, y: y, w: w, h: h };
		}
	}
};

Mutations.prototype.scrambleRandArea = function(grid) {
	var area = this.getRandArea(grid);
	return this.scrambleArea(grid, area.x, area.y, area.w, area.h);
};

Mutations.prototype.scrambleGrid = function(grid) {
	return this.scrambleArea(grid, 0, 0, grid.width, grid.height);
};

Mutations.prototype.randomizeRandArea = function(grid) {
	var area = this.getRandArea(grid, Math.floor(grid.width / 2), Math.floor(grid.height / 2));
	for(var x = area.x; x < area.x + area.w; ++x) {
		for(var y = area.y; y < area.y + area.h; ++y) {
			grid.set(x, y, this.randomizeComponent(grid.get(x, y)));
		}
	}
	return true;
};

Mutations.prototype.reflect = function(grid) {
	var x, y;
	var rnd = Math.floor(Math.random() * 4);
	if(rnd == 0) {
		// reflect left side to right
		for(y = 0; y < grid.height; ++y) {
			for(x = 0; x < Math.floor(grid.width / 2); ++x) {
				grid.set(grid.width - 1 - x, y, grid.get(x, y));
			}
		}
	} else if(rnd == 1) {
		// reflect right side to left
		for(y = 0; y < grid.height; ++y) {
			for(x = 0; x < Math.floor(grid.width / 2); ++x) {
				grid.set(x, y, grid.get(grid.width - 1 - x, y));
			}
		}
	} else if(rnd == 2) {
		// reflect top side to bottom
		for(x = 0; x < grid.width; ++x) {
			for(y = 0; y < Math.floor(grid.height / 2); ++y) {
				grid.set(x, grid.height - 1 - y, grid.get(x, y));
			}
		}
	} else {
		// reflect bottom side to top
		for(x = 0; x < grid.width; ++x) {
			for(y = 0; y < Math.floor(grid.height / 2); ++y) {
				grid.set(x, y, grid.get(x, grid.height - 1 - y));
			}
		}
	}
	return true;
};

Mutations.prototype.copyArea = function(grid, fromX, fromY, toX, toY, w, h) {
	var tmpGrid = makeGrid(w, h);
	var x, y;
	for(x = fromX; x < fromX + w; ++x) {
		for(y = fromY; y < fromY + h; ++y) {
			tmpGrid.set(x - fromX, y - fromY, grid.get(x, y));
		}
	}
	for(x = 0; x < w; ++x) {
		for(y = 0; y < h; ++y) {
			grid.set(x + toX, y + toY, tmpGrid.get(x, y));
		}
	}
	return true;
};

Mutations.prototype.copyHalf = function(grid) {
	var rnd = Math.floor(Math.random() * 4);
	if(rnd == 0) {
		// copy left side to right
		return this.copyArea(grid, 0, 0, Math.floor((grid.width + 1) / 2), 0, Math.floor(grid.width / 2), grid.height);
	} else if(rnd == 1) {
		// copy right side to left
		return this.copyArea(grid, Math.floor((grid.width + 1) / 2), 0, 0, 0, Math.floor(grid.width / 2), grid.height);
	} else if(rnd == 2) {
		// copy top side to bottom
		return this.copyArea(grid, 0, 0, 0, Math.floor((grid.height + 1) / 2), grid.width, Math.floor(grid.height / 2));
	} else {
		// copy bottom side to top
		return this.copyArea(grid, 0, Math.floor((grid.height + 1) / 2), 0, 0, grid.width, Math.floor(grid.height / 2));
	}
};

Mutations.prototype.copyRandArea = function(grid) {
	var destX, destY, area;
	do {
		area = this.getRandArea(grid, Math.floor(grid.width / 2), Math.floor(grid.height / 2), null, null, null, 2);
		destX = Math.floor(Math.random() * (grid.width - area.w));
		destY = Math.floor(Math.random() * (grid.height - area.h));
	} while(destX == area.x && destY == area.y);
	return this.copyArea(grid, area.x, area.y, destX, destY, area.w, area.h);
};

/***** Hybridization *****/

Mutations.prototype.hybridMesh = function(grid1, grid2) {
	var result = makeGrid(grid1.width, grid1.height);
	var l = grid1.width * grid1.height;
	for(var i = 0; i < l; i++) {
		if(Math.random() > 0.5) {
			result[i] = grid1[i];
		} else {
			result[i] = grid2[i];
		}
	}
	return result;
};

Mutations.prototype.hybridHalve = function(grid1, grid2) {
	var result = makeGrid(grid1.width, grid1.height);
	if(Math.random() > 0.5) {
		var tmp = grid1;
		grid1 = grid2;
		grid2 = tmp;
	}
	var i, cutoff, x, y;
	var len = grid1.width * grid1.height;
	if(Math.random() > 0.5) {
		// left-right
		cutoff = Math.floor(grid1.width / 2);
		for(i = 0; i < len; ++i) {
			x = i % grid1.width;
			if(x < cutoff) {
				result[i] = grid1[i];
			} else if(x == cutoff && grid1.width % 2 == 1) {
				y = Math.floor(i / grid1.width);
				if(y < grid1.height / 2) {
					result[i] = grid1[i];
				} else {
					result[i] = grid2[i];
				}
			} else {
				result[i] = grid2[i];
			}
		}
	} else {
		// up-down
		cutoff = Math.floor(len / 2);
		for(i = 0; i < cutoff; ++i) {
			result[i] = grid1[i];
		}
		for(; i < len; ++i) {
			result[i] = grid2[i];
		}
	}
	return result;
};


/***** Overall *****/

Mutations.prototype.mutate = function(grid) {
	grid = makeGrid(grid.width, grid.height, grid);

	var mutateComponents = true;

	if(Math.random() < this.phaseConfig.mutation.overallMutationChance) {
		mutateComponents = (Math.random() < this.phaseConfig.mutation.overallAndComponentMutationChance);
		var overallMutSuccess = false;
		do {
			var overallMutType = weightedRand(this.phaseConfig.mutation.overallMutationWeights);
			if(overallMutType == 'shift') overallMutSuccess = this.shiftGrid(grid);
			else if(overallMutType == 'rotate') overallMutSuccess = this.rotateGrid(grid);
			else if(overallMutType == 'scrambleArea') overallMutSuccess = this.scrambleRandArea(grid);
			else if(overallMutType == 'scramble') overallMutSuccess = this.scrambleGrid(grid);
			else if(overallMutType == 'randomizeArea') overallMutSuccess = this.randomizeRandArea(grid);
			else if(overallMutType == 'reflectHalf') overallMutSuccess = this.reflect(grid);
			else if(overallMutType == 'copyHalf') overallMutSuccess = this.copyHalf(grid);
			else if(overallMutType == 'copyRandArea') overallMutSuccess = this.copyRandArea(grid);
		} while (Math.random() < this.phaseConfig.mutation.overallMutationRepeatChance);
		if(!overallMutSuccess) mutateComponents = true;
	}

	if(mutateComponents) {
		var componentsMutated = false;
		var compMutRate = Math.random() * (this.phaseConfig.mutation.componentMutationRateMax - this.phaseConfig.mutation.componentMutationRateMin) + this.phaseConfig.mutation.componentMutationRateMin;
		while(!componentsMutated) {
			var newComp;
			for(var i = 0; i < grid.length; ++i) {
				if(Math.random() < compMutRate) {
					var compMutType = weightedRand(this.phaseConfig.mutation.componentMutationWeights);
					newComp = null;
					if(compMutType == 'randomize') newComp = this.randomizeComponent(grid[i]);
					else if(compMutType == 'randomizeType') newComp = this.randomizeComponentType(grid[i]);
					else if(compMutType == 'remove') newComp = this.removeComponent(grid[i]);
					if(newComp) {
						grid[i] = newComp;
						componentsMutated = true;
					}
				}
			}
		}
	}

	if(Math.random() < this.phaseConfig.mutation.randomizeEmptyCellChance) {
		for(var i = 0; i < grid.length; ++i) {
			if(grid[i] == 'XX') {
				grid[i] = this.randomizeComponent(grid[i]);
			}
		}
	}

	return grid;
};

Mutations.prototype.hybrid = function(grid1, grid2) {
	var hybridType = weightedRand(this.phaseConfig.hybridization.hybridizationTypeWeights);
	var result;
	if(hybridType == 'mesh') result = this.hybridMesh(grid1, grid2);
	else if(hybridType == 'halve') result = this.hybridHalve(grid1, grid2);
	if(result && Math.random() < this.phaseConfig.hybridization.hybridMutationChance) {
		this.mutate(result);
	}
	return result;
};


module.exports = Mutations;
