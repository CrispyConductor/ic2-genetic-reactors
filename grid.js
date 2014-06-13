var fs = require('fs');

exports.makeGrid = function(width, height, components) {
	var grid = [];
	grid.width = width;
	grid.height = height;
	grid.get = function(x, y) {
		return grid[y*width+x];
	};
	grid.set = function(x, y, d) {
		grid[y*width+x] = d;
	};
	grid.toJSON = function() {
		return {
			width: this.width,
			height: this.height,
			data: this.slice(0)
		};
	};
	var l = width * height;
	for(var i = 0; i < l; ++i) {
		if(components && components[i]) {
			grid[i] = components[i];
		} else {
			grid[i] = 'XX';
		}
	}
	return grid;
};

exports.loadGrid = function(filename) {
	var contents = fs.readFileSync(filename, { encoding: 'utf8' });
	var lines = contents.split('\n').filter(function(l) {
		return l.length >= 2 && l[0] != '#';
	}).map(function(l) {
		return l.split(/[ 	]+/).filter(function(c) {
			return !!c.length;
		});
	});
	var width = lines[0].length;
	var height = lines.length;
	var components = Array.prototype.concat.apply([], lines);
	return exports.makeGrid(width, height, components);
};

exports.printGrid = function(grid) {
	for(var i = 0; i < grid.height; i++) {
		var row = grid.slice(i * grid.width, (i + 1) * grid.width);
		console.log(row.join(' '));
	}
};
