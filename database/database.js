// This module creates and modifies database documents

const mongoose = require("mongoose");
// const fs = require("node:fs");
const { cbSchema, cbPlayerSchema, cbHitSchema } = require("../schemas/cb-schema");
const { clanSchema } = require("../schemas/cb-clan");


/* Unused after schema update
// get list of players
const data = fs.readFileSync("database/Aquarium.json");


// parse JSON string to JSON object
const databases = JSON.parse(data);
const listPlayers = [{}, {}];
databases.forEach(function (db) {
	if (db.IGN !== "Aquarium" && db.IGN !== "AquariumStatus") {
		listPlayers[0][db.IGN] = db.userId;
		if (db.userId) {
			listPlayers[1][db.userId] = db.IGN;
		}
	}
});
*/
const listPlayers = {};
clanSchema.find({}, (err, clans) => {
	if (err) {
		console.log(err);
	}
	else {
		clans.forEach((clan) => {
			const clanId = clan.clanId;
			const playerNames = {
				"IGNToId": {},
				"idToIGN": {},
			};
			clan.players.forEach((player) => {
				playerNames.IGNToId[player.IGN] = player.userId;
				playerNames.idToIGN[player.userId] = player.IGN;
			});
			listPlayers[clanId] = playerNames;
		});
	}
});

/*
// dict IGN = Discord id
async function findPlayer(IGN, userId, clanId) {
	const player = clanSchema.aggregate(
		[
			{
			  '$match': {
				'$and': [
				  {
					'$or': [
					  {
						'players.IGN': IGN
					  }, {
						'players.userId': userId
					  }
					]
				  }, {
					'clanId': clanId
				  }
				]
			  }
			}, {
			  '$unwind': {
				'path': '$players'
			  }
			}, {
			  '$match': {
				'$or': [
				  {
					'players.IGN': IGN
				  }, {
					'players.userId': userId
				  }
				]
			  }
			}
		]
	);
	return player;
}
*/

module.exports = {
	/**
	 * Checks if player is in the clan list
	 * @param {String} player
	 * @param {String} clanId
	 * @returns {Boolean} true if player in given clanId
	 */
	isPlayer: function(player, clanId) {
		return player in listPlayers[clanId].IGNToId || player in listPlayers[clanId].idToIGN;
	},

	/**
	 * IGN => Discord id
	 * @param {String} IGN
	 * @param {String} clanId
	 * @returns {String} Discord id of IGN
	 */
	IGNToId: function(IGN, clanId) {
		return listPlayers[clanId].IGNToId[IGN];
	},

	/**
	 * Discord id => IGN
	 * @param {String} id
	 * @param {String} clanId
	 * @returns {String} IGN of Discord id
	 */
	idToIGN: function(id, clanId) {
		return listPlayers[clanId].idToIGN[id];
	},

	// Hits number => Printable
	hitsToPrint: function(nbHits) {
		let printHits = nbHits.toString();
		if (nbHits === 1) {
			printHits += " hit";
		}
		else {
			printHits += " hits";
		}
		return printHits;
	},

	// create CB documents
	createCB: async function(clanId, cbId, bossIds, logs) {

		/* Unused after schema update
		fs.readFile("database/Aquarium.json", async function (err, data) {

			if (err) {
				console.log(`Error reading file from disk: ${err}`);
			} else {

				// parse JSON string to JSON object
				const databases = JSON.parse(data);

				// create CB documents for 5 days
				databases.forEach(db => {
					for (let i = 1; i <= 5; ++i) {
						new cbSchema({
							cbId: cbId,
							day: i,
							IGN: db.IGN,
							userId: db.userId,
							nbAcc: db.nbAcc,
							hitsDone: 0,
							bossIds: [],
							ping: true,
						}).save();
					}
				});

				// remove previous tracker if it exists
				await cbSchema.deleteMany({ "IGN": "AquariumStatus" });
				// set tracker
				await new cbSchema({
					cbId: cbId,
					day: 0,
					IGN: "AquariumStatus",
					nbAcc: 30,
					hitsDone: 90,
					lap: 1,
					boss: 1,
					bossIds: bossIds,
					logs: logs,
				}).save();
			}

		});
		*/
		// Find clan data based on clan id
		const clanData = await clanSchema.findOne({ "clanId": clanId });

		const { players, name, nbAcc } = clanData;

		// Add clan information
		players.push({
			IGN: name,
			nbAcc: players.length,
		});

		// Create document for each player

		const newHitList = [];
		players.forEach(player => {
			const newPlayerHits = [];
			for (let i = 1; i <= 5; ++i) {
				newPlayerHits.push(new cbHitSchema({
					"day": i,
					"hitsDone": 0,
					"coordinate": [],
				}));
			}
			newHitList.push(
				new cbPlayerSchema({
					"IGN": player.IGN,
					"userId": player.userId,
					"nbAcc": player.nbAcc,
					"hits": newPlayerHits,
					"ping": true,
				}));
		});

		// Create new CB document to add to the list of CBs in cb-clan
		const newCb = new cbSchema({
			"cbId": cbId,
			"day": 0,
			"nbAcc": nbAcc,
			"hitsDone": [0, 0, 0, 0, 0],
			"lap": 1,
			"boss": 1,
			"bossIds": bossIds,
			"hitList": newHitList,
			"logs": logs,
		});

		// Add to list of CBs in cb-clan
		await clanSchema.findOneAndUpdate({ "clanId": clanId }, { "cbActive": true, $push: { "CBs": newCb } });


		/* Deciprecated after schema update
		const clanStatus = name + "Status";

		// remove previous tracker if it exists
		await cbSchema.deleteMany({ "IGN": clanStatus });
		// set tracker
		await new cbSchema({
		   cbId: cbId,
		   day: 0,
		   IGN: clanStatus,
		   nbAcc: 30,
		   hitsDone: 90,
		   lap: 1,
		   boss: 1,
		   bossIds: bossIds,
		   logs: logs,
		}).save();
		*/
	},

	/**
	 * Add hits to Hit List
	 * @param {String} clanId
	 * @param {Number} cbID
	 * @param {Number} day
	 * @param {String} userId
	 * @param {Number} nbHitsToAdd
	 * @param {String} bossId
	 * @callback callback
	 */
	cbAddHit: async function(clanId, cbId, day, userId, nbHitsToAdd, bossId, callback) {
		// Find the document corresponding to the right CB, the right day and the right player name
		const player = await clanSchema.aggregate([
			{
				$match: {
					$and: [
						{
							"clanId": clanId,
						},
						{
							"CBs.cbId": cbId,
						},
						{
							"CBs.hitList.userId": userId,
						},
						{
							"CBs.hitList.hits.day": day,
						},
					],
				},
			},
			{
				$unwind: "$CBs.hitList.hits",
			},
			{
				$match: {
					$and: [
						{
							"CBs.cbId": cbId,
						},
						{
							"CBs.hitList.userId": userId,
						},
						{
							"CBs.hitList.hits.day": day,
						},
					],
				},
			},
			{
				$replaceRoot: {
					"newRoot": "$CBs.hitList",
				},
			},
		]);

		const { hits: { hitsDone }, nbAcc } = player[0];
		if (hitsDone >= (nbAcc * 3)) {
			callback("All hits done");
		}
		else if ((hitsDone + nbHitsToAdd) > (nbAcc * 3)) {
			callback("Too many hits");
		}
		else {
			await clanSchema.updateOne({
				"clanId": clanId,
				"CBs.cbId": cbId,
				"CBs.hitList.userId": userId,
				"CBs.hitList.hits.day": day,
			},
			{
				$inc:
					{
						"CBs.$[cbId].hitList.$[player].hits.$[day].hitsDone": nbHitsToAdd,
						"CBs.$[cbId].hitsDone": nbHitsToAdd,
					},
				$pull: { "CBs.$[cbId].hitList.$[player].hits.$[day].coordinate": bossId },
			},
			{
				arrayFilters: [
					{ "cbId": { "CBs.cbId": cbId } },
					{ "player": { "CBs.hitList.userId": userId } },
					{ "day": { "CBs.hitList.hits.day": day } },
				],
			});

			console.log(`Added ${nbHitsToAdd} hit(s) to ${this.idToIGN(userId)}`);
			callback(hitsDone + nbHitsToAdd);
		}
	},

	/**
	 * Remove hits from Hit List
	 * @param {String} clanId
	 * @param {Number} cbID
	 * @param {Number} day
	 * @param {String} userId
	 * @param {Number} nbHitsToRemove
	 * @callback callback
	 */
	cbRemoveHit: async function(clanId, cbId, day, userId, nbHitsToRemove, callback) {
		// Find the document corresponding to the right CB, the right day and the right player name
		const player = await clanSchema.aggregate([
			{
				$match: {
					$and: [
						{
							"clanId": clanId,
						},
						{
							"CBs.cbId": cbId,
						},
						{
							"CBs.hitList.userId": userId,
						},
						{
							"CBs.hitList.hits.day": day,
						},
					],
				},
			},
			{
				$unwind: "$CBs.hitList.hits",
			},
			{
				$match: {
					$and: [
						{
							"CBs.cbId": cbId,
						},
						{
							"CBs.hitList.userId": userId,
						},
						{
							"CBs.hitList.hits.day": day,
						},
					],
				},
			},
			{
				$replaceRoot: {
					"newRoot": "$CBs.hitList",
				},
			},
		]);

		const { hits: { hitsDone } } = player[0];

		if (hitsDone === 0) {
			callback("No hits to remove");
		}
		else if ((hitsDone - nbHitsToRemove) < 0) {
			callback("Too many hits");
		}
		else {
			await clanSchema.updateOne({
				"clanId": clanId,
				"CBs.cbId": cbId,
				"CBs.hitList.userId": userId,
				"CBs.hitList.hits.day": day,
			},
			{
				$inc:
					{
						"CBs.$[cbId].hitList.$[player].hits.$[day].hitsDone": (-1 * nbHitsToRemove),
						"CBs.$[cbId].hitsDone": (-1 * nbHitsToRemove),
					},
			},
			{
				arrayFilters: [
					{ "cbId": { "CBs.cbId": cbId } },
					{ "player": { "CBs.hitList.userId": userId } },
					{ "day": { "CBs.hitList.hits.day": day } },
				],
			});
			console.log(`Removed ${nbHitsToRemove} hit(s) to ${this.idToIGN(userId)}`);
			callback(hitsDone - nbHitsToRemove);
		}
	},

	// kill boss in boss tracker
	cbKillBoss: async function(killCbId, add) {
		const doc = await cbSchema.findOne({ "cbId": killCbId, "IGN": "AquariumStatus" });
		let { lap, boss, day } = doc;
		if (boss === 5 && add) {
			boss = 1;
			++lap;
		}
		else if (add) {
			++boss;
		}
		else if (lap === 1 && boss === 1 && !add) {
			return "Cannot remove";
		}
		else if (boss === 1 && !add) {
			--lap;
			boss = 5;
		}
		else if (!add) {
			--boss;
		}
		await cbSchema.updateOne({ cbId: killCbId, "IGN": "AquariumStatus" }, { $set: { lap: lap, boss: boss } });
		console.log("Killed Boss");
		const pings = await cbSchema.find({ "cbId": killCbId, "day": day, "IGN": { $ne: "AquariumStatus" }, "bossIds": boss }, { "_id": 0, "userId": 1 }, { sort: { "_id": 1 } });
		return pings;
	},
};