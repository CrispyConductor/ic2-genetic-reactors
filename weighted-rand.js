
function getRandWeighted(weightMap) {
	var key;
	var total = 0;
	for(key in weightMap) {
		total += weightMap[key];
	}
	if(!total) return Object.keys(weightMap)[0];
	var rand = Math.floor(Math.random() * total);
	for(key in weightMap) {
		total -= weightMap[key];
		if(rand >= total) return key;
	}
	return Object.keys(weightMap)[0];
}

module.exports = getRandWeighted;
