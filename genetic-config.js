var extend = require('node.extend');

var base = {	// Try random components for optimal efficiency, without worrying about cost

	numGenerations: 500,

	componentWeights: {	// extends from the main component weights
		XX: 0,
		NT: 0
	},

	scoring: {
		efficiency: {
			factor: 100.0	// multiplied by the value and added to the score
		},
		overallEUPerTick: {
			//factor: 1.0
			logFactor: 1.0, 	// factor to multiply by the logarithm.  ie, score += (ln(value + 1) / ln(logBase) + logOffset) * logFactor
			logBase: 1.1,
			logOffset: -16.0
		},
		usesSingleUseCoolant: {
			values: {
				'true': -30		// added to the score if the value matches
			}
		},
		timedOut: {
			values: {
				'true': -800
			}
		},
		cooldownTicks: {
			factor: -0.015
		},
		mark: {
			values: {
				/*5: 0,
				4: 1,
				3: 2,
				2: 3,
				1: 4*/
				1: 75,
				2: 74,
				3: -200,
				4: -300,
				5: -4000
			}
		},
		countNN: { factor: -60.0 },
		countNT: { factor: -60.0 }
	},

	algorithm: {
		families: 40,
		membersPerFamily: 3,
		offspringPerMember: 10,
		randomFamiliesPerGeneration: 30,
		randomFamiliesInitialGeneration: 16000,
		sameFamilyHybrids: 1,
		crossFamilyHybrids: 0,
		crossPopulationHybrids: 0
	},

	hybridization: {
		hybridizationTypeWeights: {
			mesh: 4,		// Intersperse components randomly
			halve: 10		// use 1 half from each parent
		},
		hybridMutationChance: 0.3
	},

	mutation: {

		componentMutationRateMin: 0.05,
		componentMutationRateMax: 0.3,
		componentMutationWeights: {
			randomize: 10,		// switch to (weighted) random component
			randomizeType: 10,	// switch to random component of same type
			remove: 0			// remove component
		},

		overallMutationChance: 0.15,
		overallAndComponentMutationChance: 0.5,	// chance that components will be mutated in addition to an overall mutation
		overallMutationRepeatChance: 0.15,		// chance that multiple overall mutations will be applied in a single round
		overallMutationWeights: {
			shift: 10,			// shift grid by 1 cell in a random direction
			rotate: 15,			// rotate grid by 1 cell in a random direction
			scrambleArea: 3,	// scramble a portion of the components
			scramble: 1,		// completely scramble the components
			randomizeArea: 2,	// randomize a portion of the components
			reflectHalf: 1,		// reflect one half of the reactor onto the other half
			copyHalf: 1,		// copy (translate without reflecting) one half of the reactor onto the other
			copyRandArea: 1		// copy a randomly selected area of the reactor to a random position
		},

		randomizeEmptyCellChance: 0.6 // chance to replace empty cells with a random component

	},

	stalePruning: {
		pruneStaleFamilies: true,
		keepTopFamilies: 8,
		staleGenerations: 25,
		preserveStaleCounterOnHybrid: true
	}

};

module.exports = {

	reactorSize: 6,	// number of extra chambers

	componentCosts: {
		XX: 0,		// no component

		VV: 10,		// basic heat vent
		VR: 12,		// reactor heat vent
		VA: 25,		// advanced heat vent
		VC: 13,		// component heat vent
		VO: 15,		// overclocked heat vent

		EE: 10,		// heat exchanger
		EA: 25,		// advanced heat exchanger
		ER: 11,		// reactor heat exchanger
		EC: 13,		// component heat exchanger

		C1: 4,		// 10k coolant cell
		C3: 9,		// 30k coolant cell
		C6: 20,		// 60k coolant cell

		CR: 20,		// RSH condensator
		CL: 65,		// LZH condensator

		U1: 0,		// uranium cell (cost of uranium already taken into account with efficiency)
		U2: 2,		// dual uranium cell (extra cost on top of the 2 component cells)
		U4: 5,		// quad uranium cell

		NN: 2,		// neutron reflector
		NT: 10,		// thick neutron reflector

		PP: 5,		// reactor plating
		PC: 10,		// containment reactor plating
		PH: 8		// heat capacity reactor plating
	},

	consumableCosts: {
		CR: 3,
		CL: 8,
		U1: 12,
		U2: 25,
		U4: 52,
		NN: 7,
		NT: 21
	},

	componentGroups: [
		['XX'],
		['VV', 'VR', 'VA', 'VC', 'VO'],
		['EE', 'EA', 'ER', 'EC'],
		['C1', 'C3', 'C6'],
		['CR', 'CL'],
		['U1', 'U2', 'U4'],
		['NN', 'NT'],
		['PP', 'PC', 'PH']
	],

	componentWeights: {	// base weights, can be modified per-phase
		XX: 30,

		VV: 10,
		VR: 10,
		VA: 10,
		VC: 10,
		VO: 10,

		EE: 10,
		EA: 10,
		ER: 10,
		EC: 10,

		C1: 10,
		C3: 10,
		C6: 10,

		CR: 5,
		CL: 5,

		U1: 20,
		U2: 20,
		U4: 20,

		NN: 0,
		NT: 30,

		PP: 3,
		PC: 0,
		PH: 5
	},

	resultPopulation: 'promoted',

	populations: {

		main: {			// The main population with the base scoring rules
			phases: [
				base
			]
		},

		highEfficiency: {
			phases: [
				extend(true, {}, base, {
					scoring: {
						mark: {
							values: {
								1: 0,
								2: 0,
								3: 0,
								4: 0,
								5: -4000
							}
						}
					},
					algorithm: {
						families: 3,
						membersPerFamily: 3,
						offspringPerMember: 4,
						randomFamiliesPerGeneration: 10,
						randomFamiliesInitialGeneration: 16000,
						sameFamilyHybrids: 1,
						crossFamilyHybrids: 0,
						crossPopulationHybrids: 0
					}
				})
			]
		},

		hybrids: {
			phases: [
				extend(true, {}, base, {
					algorithm: {
						families: 20,
						membersPerFamily: 3,
						offspringPerMember: 10,
						randomFamiliesPerGeneration: 10,
						randomFamiliesInitialGeneration: 0,
						sameFamilyHybrids: 3,
						crossFamilyHybrids: 40,
						crossPopulationHybrids: 40
					},
					hybridization: {
						crossPopulationHybridWeights: {
							main: 10,
							highEfficiency: 6,
							promoted: 2
						}
					}
				})
			]
		},

		promoted: {
			phases: [
				extend(true, {}, base, {
					algorithm: {
						families: 3,
						membersPerFamily: 4,
						randomFamiliesPerGeneration: 0,
						randomFamiliesInitialGeneration: 0
					},
					scoring: {
						totalCost: {
							factor: -0.004
						},
						unusedColumns: {
							factor: 0.1
						}
					},
					promotions: {
						prePromotionPruneFamilies: 10,
						promotionInterval: 50,
						numPromotionsPerPopulation: 5,
						promotedPopulations: [ 'main', 'hybrids' ]
					},
					mutation: {
						componentMutationRateMin: 0.05,
						componentMutationRateMax: 0.1,
						componentMutationWeights: {
							randomize: 10,		// switch to (weighted) random component
							randomizeType: 40,	// switch to random component of same type
							remove: 30			// remove component
						},

						overallMutationChance: 0.05,
						randomizeEmptyCellChance: 0.05 // chance to replace empty cells with a random component

					}
				})
			]
		}

	}

};
