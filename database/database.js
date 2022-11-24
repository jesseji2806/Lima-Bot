// This module creates and modifies database documents
const mongoose = require("mongoose");
// const fs = require("node:fs");
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

		// Find clan data based on clan id
		const clanData = await clanSchema.findOne({ "clanId": clanId });

		const players = clanData.players.filter(player => player.nbAcc > 0);

		// Create new CB document to add to the list of CBs in cb-clan
		const newCb = clanData.CBs.create({
			"cbId": cbId,
			"nbAcc": clanData.nbAcc,
			"bossIds": bossIds,
			"logs": logs,
		});
		clanData.CBs.push(newCb);

		const currCb = clanData.CBs.find(cb => cb["_id"] === newCb["_id"]);
		console.log(currCb instanceof mongoose.Document);
		// Create document for each player
		players.forEach(player => {
			const cbPlayer = currCb.hitList.create({
				"IGN": player.IGN,
				"userId": player.userId,
				"nbAcc": player.nbAcc,
				"ping": true,
			});
			newCb.hitList.push(cbPlayer);

			const newPlayer = currCb.hitList.find(p => p["_id"] === cbPlayer["_id"]);
			for (let i = 1; i <= 5; ++i) {
				newPlayer.hits.push({
					"day": i,
					"hitsDone": 0,
				});
			}
		});

		// Set CB to active
		clanData.cbActive = true;

		// Add to list of CBs in cb-clan
		await clanData.save();
	},

	/**
	 * Add hits to Hit List
	 * Uses cbData document instead of aggregation
	 * @param {cbSchema} cbData
	 * @param {Number} day
	 * @param {String} userId
	 * @param {Number} nbHitsToAdd
	 * @callback callback
	 */
	cbAddHit: async function(cbData, day, userId, nbHitsToAdd, callback) {
		// Find the document corresponding to the right CB, the right day and the right player name

		const player = cbData.hitList.find(cbPlayer => cbPlayer.userId == userId);

		const { hits, nbAcc } = player;
		const hitsDone = hits[day - 1].hitsDone;

		if (hitsDone >= (nbAcc * 3)) {
			callback("All hits done");
		}
		else if ((hitsDone + nbHitsToAdd) > (nbAcc * 3)) {
			callback("Too many hits");
		}
		else {
			let completed = false;
			// increment hit counts and save
			player.hits[day - 1].hitsDone += nbHitsToAdd;
			player.hits[day - 1].coordinate[cbData.boss - 1] = false;
			cbData.hitsDone[day - 1] += nbHitsToAdd;

			// check if all hits are done
			if (player.hits[day - 1].hitsDone >= (nbAcc * 3)) {
				player.hits[day - 1].coordinate = Array(5).fill(false);
				completed = true;
			}
			await cbData.ownerDocument().save();

			// log changes
			console.log(`Added ${nbHitsToAdd} hit(s) to ${userId}`);
			callback(hitsDone + nbHitsToAdd, completed);
		}
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
	/**
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
	*/

	/**
	 * Remove hits from Hit List
	 * Uses cbData document instead of aggregation
	 * @param {cbSchema} cbData
	 * @param {Number} day
	 * @param {String} userId
	 * @param {Number} nbHitsToRemove
	 * @callback callback
	 */
	cbRemoveHit: async function(cbData, day, userId, nbHitsToRemove, callback) {
		// Find the document corresponding to the right CB, the right day and the right player name
		const player = cbData.hitList.find(cbPlayer => cbPlayer.userId == userId);

		const hitsDone = player.hits[day - 1].hitsDone;

		if (hitsDone === 0) {
			callback("No hits to remove");
		}
		else if ((hitsDone - nbHitsToRemove) < 0) {
			callback("Too many hits");
		}
		else {
			// decrement hit counts and save
			player.hits[day - 1].hitsDone -= nbHitsToRemove;
			cbData.hitsDone[day - 1] -= nbHitsToRemove;
			await cbData.ownerDocument().save();

			// log changes
			console.log(`Removed ${nbHitsToRemove} hit(s) to ${userId}`);
			callback(hitsDone - nbHitsToRemove);
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
	/**
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
	*/

	/**
	 * Kill boss in boss tracker
	 * @param {cbSchema} cbData
	 * @param {Boolean} add
	*/
	cbKillBoss: async function(cbData, add) {
		const { lap, boss, day } = cbData;
		if (boss === 5 && add) {
			cbData.boss = 1;
			++cbData.lap;
		}
		else if (add) {
			++cbData.boss;
		}
		else if (lap === 1 && boss === 1 && !add) {
			return "Cannot remove";
		}
		else if (boss === 1 && !add) {
			--cbData.lap;
			cbData.boss = 5;
		}
		else if (!add) {
			--cbData.boss;
		}
		// save updates
		await cbData.ownerDocument().save();

		// log update
		console.log(`Killed Boss ${boss}`);

		// getting players to ping
		const pings = [];
		cbData.hitList.forEach(player => {
			if (player.hits[day - 1].coordinate[cbData.boss - 1]) {
				pings.push(player.userId);
			}
		});
		return pings;
	},
};