// This module creates and modifies database documents
const mongoose = require("mongoose");
// const fs = require("node:fs");
const { clanSchema } = require("../schemas/cb-clan");
const { AddHitReturnValues, RemoveHitReturnValues } = require("./retval");

// Cache for player data
const playersCache = new Map();

/**
 * Get players data for a specific clan with caching
 * @param {String} clanId
 * @returns {Object} Object containing IGNToId and idToIGN mappings
 */
async function getPlayers(clanId) {
	// Check cache first
	if (playersCache.has(clanId)) {
		return playersCache.get(clanId);
	}

	try {
		const clan = await clanSchema.findById(clanId);
		if (!clan) {
			return null;
		}

		const playerNames = {
			"IGNToId": {},
			"idToIGN": {},
		};

		clan.players.forEach((player) => {
			playerNames.IGNToId[player.IGN] = player.userId;
			playerNames.idToIGN[player.userId] = player.IGN;
		});

		// Cache the result
		playersCache.set(clanId, playerNames);

		return playerNames;
	}
	catch (err) {
		console.log(err);
		return null;
	}
}

/**
 * Preload and cache players data for all clans
 */
async function preloadAllPlayersCache() {
	try {
		console.log("Preloading players cache...");
		const allClans = await clanSchema.find({}, "_id players");

		for (const clan of allClans) {
			const playerNames = {
				"IGNToId": {},
				"idToIGN": {},
			};

			clan.players.forEach((player) => {
				playerNames.IGNToId[player.IGN] = player.userId;
				playerNames.idToIGN[player.userId] = player.IGN;
			});

			playersCache.set(clan._id.toString(), playerNames);
		}

		console.log(`Preloaded players cache for ${allClans.length} clans`);
	}
	catch (err) {
		console.log("Error preloading players cache:", err);
	}
}

/**
 * Clear cache for a specific clan (call when clan players are modified)
 * @param {String} clanId
 */
function clearPlayersCache(clanId) {
	playersCache.delete(clanId);
}

/**
 * Clear entire players cache
 */
function clearAllPlayersCache() {
	playersCache.clear();
}


module.exports = {

	/**
	 * Preload and cache players data for all clans
	 */
	preloadAllPlayersCache: preloadAllPlayersCache,

	/**
	 * Clear cache for a specific clan (call when clan players are modified)
	 * @param {String} clanId
	 */
	clearPlayersCache: clearPlayersCache,

	/**
	 * Clear entire players cache
	 */
	clearAllPlayersCache: clearAllPlayersCache,

	/**
	 * Gets clan id for a given interaction
	 * @typedef {import("discord.js").Interaction} Interaction
	 * @param {Interaction} interaction
	 * @returns {String} clanId
	 */
	getClanId: async function(interaction) {
		const guildId = interaction.guild.id;
		const clan = await clanSchema.find({ "guildId": guildId });
		if (!clan || clan.length === 0) {
			return null;
		}
		else if (clan.length > 1) {
			// Multiple clans found, search for the one with matching categoryId
			const categoryId = interaction.channel.parentId;
			const foundClan = clan.find(c => c.categoryId === categoryId);
			return foundClan ? foundClan._id : null;
		}
		else {
			// Single clan found, return its id
			return clan[0]._id;
		}
	},

	/**
	 * Gets clan id and the associated data for a given interaction
	 * @typedef {import("discord.js").Interaction} Interaction
	 * @param {Interaction} interaction
	 * @returns {Object} {
	 * 	clanId: String,
	 * 	clanData: Object
	 * }
	 */
	getClanIdAndData: async function(interaction) {
		const guildId = interaction.guild.id;
		const clan = await clanSchema.find({ "guildId": guildId });
		if (!clan || clan.length === 0) {
			return {
				clanId: null,
				clanData: null,
			};
		}
		else if (clan.length > 1) {
			// Multiple clans found, search for the one with matching categoryId
			const categoryId = interaction.channel.parentId;
			const foundClan = clan.find(c => c.categoryId === categoryId);
			return foundClan ? {
				clanId: foundClan._id,
				clanData: foundClan,
			} : {
				clanId: null,
				clanData: null,
			};
		}
		else {
			// Single clan found, return its id
			return {
				clanId: clan[0]._id,
				clanData: clan[0],
			};
		}
	},

	getNbClans: async function(guildId) {
		const clan = await clanSchema.find({ "guildId": guildId });
		return clan.length;
	},

	/**
	 * Checks if player is in the clan list
	 * @param {String} player
	 * @param {String} clanId
	 * @returns {Boolean} true if player in given clanId
	 */
	isPlayer: async function(player, clanId) {
		const players = await getPlayers(clanId);
		if (!players) return false;
		return player in players.IGNToId || player in players.idToIGN;
	},

	/**
	 * IGN => Discord id
	 * @param {String} IGN
	 * @param {String} clanId
	 * @returns {String} Discord id of IGN
	 */
	IGNToId: async function(IGN, clanId) {
		const players = await getPlayers(clanId);
		if (!players) return null;
		return players.IGNToId[IGN];
	},

	/**
	 * Discord id => IGN
	 * @param {String} id
	 * @param {String} clanId
	 * @returns {String} IGN of Discord id
	 */
	idToIGN: async function(id, clanId) {
		const players = await getPlayers(clanId);
		if (!players) return null;
		return players.idToIGN[id];
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
		const clanData = await clanSchema.findById(clanId);

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

		// Note: No need to clear cache here as we're not modifying clan.players
	},

	/**
	 * Add hits to Hit List
	 * Uses cbData document instead of aggregation
	 * @param {cbSchema} cbData
	 * @param {Number} day
	 * @param {String} userId
	 * @param {Number} nbHitsToAdd
	 */
	cbAddHit: async function(cbData, day, userId, nbHitsToAdd) {
		// Find the document corresponding to the right CB, the right day and the right player name

		const player = cbData.hitList.find(cbPlayer => cbPlayer.userId == userId);

		const { hits, nbAcc } = player;
		const hitsDone = hits[day - 1].hitsDone;

		if (hitsDone >= (nbAcc * 3)) {
			return {
				status: AddHitReturnValues.ALREADY_COMPLETED,
			};
		}
		else if ((hitsDone + nbHitsToAdd) > (nbAcc * 3)) {
			return {
				status: AddHitReturnValues.INVALID_AMOUNT,
			};
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
			return {
				status: completed ? AddHitReturnValues.COMPLETE : AddHitReturnValues.INCOMPLETE,
				hitsDone: hitsDone + nbHitsToAdd,
			};
		}
	},


	/**
	 * Remove hits from Hit List
	 * Uses cbData document instead of aggregation
	 * @param {cbSchema} cbData
	 * @param {Number} day
	 * @param {String} userId
	 * @param {Number} nbHitsToRemove
	 */
	cbRemoveHit: async function(cbData, day, userId, nbHitsToRemove) {
		// Find the document corresponding to the right CB, the right day and the right player name
		const player = cbData.hitList.find(cbPlayer => cbPlayer.userId == userId);

		const hitsDone = player.hits[day - 1].hitsDone;

		if (hitsDone === 0) {
			return {
				status: RemoveHitReturnValues.NO_HITS,
			};
		}
		else if ((hitsDone - nbHitsToRemove) < 0) {
			return {
				status: RemoveHitReturnValues.INVALID_AMOUNT,
			};
		}
		else {
			// decrement hit counts and save
			player.hits[day - 1].hitsDone -= nbHitsToRemove;
			cbData.hitsDone[day - 1] -= nbHitsToRemove;
			await cbData.ownerDocument().save();

			// log changes
			console.log(`Removed ${nbHitsToRemove} hit(s) to ${userId}`);
			return {
				status: RemoveHitReturnValues.SUCCESS,
				hitsDone: hitsDone - nbHitsToRemove,
			};
		}
	},
};