const { Schema } = require("mongoose");

const reqNumber = {
	type: Number,
	required: true,
};

const reqString = {
	type: String,
	required: true,
};

/**
 * CB Hit schema for clan battle
 * @property {Number} day
 * @property {Number} hitsDone
 * @property {Number[]} coordinate
 */
const cbHitSchema = new Schema({
	"day": reqNumber,
	"hitsDone": reqNumber,
	"coordinate": {
		type: [Boolean],
		default: Array(5).fill(false),
	},
});

/**
 * CB Player schema for clan battle
 * @property {String} IGN
 * @property {String} userId
 * @property {Number} nbAcc
 * @property {cbHitSchema[]} hits
 */
const cbPlayerSchema = new Schema({
	"IGN": reqString,
	"userId": reqString,
	"nbAcc": reqNumber,
	"hits": [cbHitSchema],
	"ping": Boolean,
});

/**
 * Schema for clan battles
 * @property {Number} cbId
 * @property {Number} day
 * @property {Number} nbAcc
 * @property {Array} hitsDone
 * @property {Number} lap
 * @property {Number} boss
 * @property {Number[]} bossIds
 * @property {cbPlayerSchema[]} hitList
 * @property {String} logs
 */
const cbSchema = new Schema({
	"cbId": reqNumber,
	"day": {
		type: Number,
		default: 0,
		required: true,
	},
	"nbAcc": reqNumber,
	"hitsDone": {
		type: Array,
		default: Array(5).fill(0),
	},
	"lap": {
		type: Number,
		default: 1,
	},
	"boss": {
		type: Number,
		default: 1,
	},
	"bossIds": Array,
	"hitList": [cbPlayerSchema],
	"logs": String,
});

module.exports = {
	cbSchema: cbSchema,
};