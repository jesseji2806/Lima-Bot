const { Schema, model } = require("mongoose");
const cbSchema = require("../schemas/cb-schema.js");

const reqNumber = {
	type: Number,
	required: true,
};

const reqString = {
	type: String,
	required: true,
};

const reqBoolean = {
	type: Boolean,
	required: true,
};

/**
 * A schema for a Priconne player
 * @property {String} IGN
 * @property {String} userId
 * @property {Number} nbAcc
 */
const playerSchema = new Schema({
	"IGN": reqString,
	"userId": reqString,
	"nbAcc": reqNumber,
});

const clanSchema = new Schema({
	"name": reqString,
	"players": [playerSchema],
	"clanId": reqString,
	"nbAcc": reqNumber,
	"CBs": [cbSchema],
	"cbActive": reqBoolean,
});

const name = "cb-clan";

module.exports = {

	/**
     * A schema for a Priconne clan
     * @property {String} name
     * @property {playerSchema[]} players
     * @property {String} clanId
     * @property {Number} nbAcc
     * @property {cbSchema[]} CBs
     * @property {Boolean} cbActive
     */
	clanSchema: model(name, clanSchema, name),
};