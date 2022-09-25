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
	"coordinate": [Number],
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
	"day": reqNumber,
	"nbAcc": reqNumber,
	"hitsDone": Array,
	"lap": Number,
	"boss": Number,
	"bossIds": Array,
	"hitList": [cbPlayerSchema],
	"logs": String,
});

module.exports = {
	cbSchema,
	cbPlayerSchema,
	cbHitSchema,
};