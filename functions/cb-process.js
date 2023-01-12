const mongoose = require("mongoose");
const { clanSchema } = require("../schemas/cb-clan");
const cbQueue = require("../schemas/cb-queue");
const { idToIGN, hitsToPrint, cbAddHit, cbRemoveHit, cbKillBoss, isPlayer } = require("../database/database");
const { createEmbed, AddRow, BossRow, RemoveRow, LinkRow } = require("../functions/cb-button");
const moment = require("moment");

class cbCollector {
	constructor(channel, message, logs, coordination, cbData) {
		this.collector = channel.createMessageComponentCollector({ componentType: "BUTTON" });
		this.channel = channel;
		this.message = message;
		this.logs = logs;
		this.coordination = coordination;
		this.cbData = cbData;

	}
	async stop() {
		await this.collector.stop("cb stopped");
	}
	async updateCollector() {
		this.cbData.day += 1;
		await this.cbData.ownerDocument().save();
	}

	async updateData(guildId) {
		const clanData = await clanSchema.findOne({ "clanId": guildId });
		this.cbData = clanData.CBs.find(cb => cb.cbId === this.cbData.cbId);
	}
}

const collectors = {};

function collectorFunc(i, type, collector, playerHit, nbHits) {
	const { cbData, logs } = collector;
	const { cbId, day } = cbData;
	if (type === "add") {
		cbAddHit(cbData, day, playerHit, nbHits, async function(retval, completed = false) {
			if (Number.isInteger(retval)) {
				// format hits for printing
				const printPlayer = idToIGN(playerHit, i.guildId);
				const printHits = hitsToPrint(nbHits);
				const printRet = hitsToPrint(retval);

				// send reply
				await i.editReply({ content: `Added ${printHits} to ${printPlayer} on day ${day}.\nYou have ${printRet} on day ${day}.` });

				// logging
				await logs.send({ "content": `(CB${cbId}) ${i.user.tag} added ${printHits} to ${printPlayer} on day ${day}. Total: ${printRet}` });

				// additional log message if all hits completed
				if (completed) {
					await logs.send({ "content": `(CB${cbId}) ${printPlayer} has completed all ${printRet} on day ${day}! Good work!` });
				}
				return;
			}
			else if (retval === "All hits done") {
				await i.editReply({ content: `Player has already hit all hits for day ${day}.` });
				return;
			}
			else if (retval === "Too many hits") {
				await i.editReply({ content: "You are trying to add too many hits at once." });
				return;
			}
			else {
				await i.editReply({ content: "An error has occured while adding hit." });
				return;
			}
		});
	}
	else if (type === "remove") {
		cbRemoveHit(cbData, day, playerHit, nbHits, async function(retval) {
			if (Number.isInteger(retval)) {
				// format hits for printing
				const printPlayer = idToIGN(playerHit, i.guildId);
				const printHits = hitsToPrint(nbHits);
				const printRet = hitsToPrint(retval);

				// send reply
				await i.editReply({ content: `Removed ${printHits} from ${printPlayer} on day ${day}.\nYou have ${printRet} on day ${day}.` });

				// logging
				await logs.send({ "content": `(CB${cbId}) ${i.user.tag} removed ${printHits} from ${printPlayer} on day ${day}. Total: ${printRet}` });
				return;
			}
			else if (retval === "No hits to remove") {
				await i.editReply({ content: `Player has no hits on day ${day}.` });
				return;
			}
			else if (retval === "Too many hits") {
				await i.editReply({ content: "You are trying to remove too many hits at once." });
				return;
			}
			else {
				await i.editReply({ content: "An error has occured while removing hit." });
				return;
			}
		});
	}
}

async function setCollector(newCollector) {

	const collector = newCollector.collector;
	// define the collector function
	collector.on("collect", async function(i) {
		const playerHit = i.user.id;
		const { cbData } = newCollector;
		const cbId = cbData.cbId;
		const cbDay = cbData.day;

		await i.deferReply({ ephemeral: true });
		if (!isPlayer(i.user.id, i.guildId) && i.customId !== "boss-killed" && i.customId !== "undo-boss-kill") {
			await i.editReply({ content: "You are not participating in this CB!" });
			return;
		}
		// adding hits
		if (i.customId === "add-hit-1") {
			collectorFunc(i, "add", newCollector, playerHit, 1);
		}
		else if (i.customId === "add-hit-2") {
			collectorFunc(i, "add", newCollector, playerHit, 2);
		}
		else if (i.customId === "add-hit-all") {
			const player = cbData.hitList.find(cbPlayer => cbPlayer.userId === playerHit);
			const hitsToAdd = (player.nbAcc * 3) - player.hits[cbDay - 1].hitsDone;
			collectorFunc(i, "add", newCollector, playerHit, hitsToAdd);
		}
		// removing hits
		else if (i.customId === "remove-hit-1") {
			collectorFunc(i, "remove", newCollector, playerHit, 1);
		}
		else if (i.customId === "remove-hit-2") {
			collectorFunc(i, "remove", newCollector, playerHit, 2);
		}
		else if (i.customId === "remove-hit-all") {
			const player = cbData.hitList.find(cbPlayer => cbPlayer.userId === playerHit);
			const hitsToRemove = player.hits[cbDay - 1].hitsDone;
			collectorFunc(i, "remove", newCollector, playerHit, hitsToRemove);
		}
		// killing boss
		else if (i.customId === "boss-killed") {
			const toPing = await cbKillBoss(cbData, true);
			await i.editReply("Boss Kill registered. Good work!");
			// updating message
			// getting status and queue data
			const queueData = await cbQueue.findOne({ "cbId": cbId });
			const { lap, boss, bossIds } = cbData;
			const { date } = queueData;

			// update collector
			newCollector.boss = boss;

			// create an embed based on the cbId and the cnDday
			const embed = createEmbed(cbId, cbDay, moment(date).unix(), lap, boss, bossIds);

			// edit the embed
			await newCollector.message.edit({ embeds: [embed], components: [AddRow, BossRow, RemoveRow, LinkRow(i.guildId, cbId)] });

			// logging
			await newCollector.logs.send({ "content": `(CB${cbId}) ${i.user.tag} killed a boss. Moving to Lap ${lap}, Boss ${boss}. ` });

			// pinging
			if (toPing.length > 0) {
				let coordPing = `Pinging players who wish to hit boss ${boss}:\n`;
				for (const user of toPing) {
					if (user) {
						coordPing += `> <@${user}>\n`;
					}
				}
				coordPing += `**Boss ${boss} is up!**`;
				await newCollector.coordination.send({ "content": coordPing });
			}
		}
		else if (i.customId === "undo-boss-kill") {
			const toPing = await cbKillBoss(cbData, false);
			if (toPing === "Cannot remove") {
				await i.editReply("Cannot undo boss kill");
				return;
			}
			else {
				await i.editReply("Undid boss kill.");
				// updating message
				// getting status and queue data

				const queueData = await cbQueue.findOne({ "cbId": cbId });
				const { lap, boss, bossIds } = cbData;
				const { date } = queueData;

				// update collector
				newCollector.boss = boss;

				// create an embed based on the cbId and the cnDday
				const embed = createEmbed(cbId, cbDay, moment(date).unix(), lap, boss, bossIds);

				// edit the embed
				await newCollector.message.edit({ embeds: [embed], components: [AddRow, BossRow, RemoveRow, LinkRow(i.guildId, cbId)] });

				// logging
				await newCollector.logs.send({ "content": `(CB${cbId}) ${i.user.tag} undid a boss kill. Returning to Lap ${lap}, Boss ${boss}. ` });

				// pinging
				if (toPing.length > 0) {
					let coordPing = `Pinging players who wish to hit boss ${boss}:\n`;
					for (const user of toPing) {
						if (user) {
							coordPing += `> <@${user}>\n`;
						}
					}
					coordPing += `**Boss ${boss} is up!**`;
					await newCollector.coordination.send({ "content": coordPing });
				}
			}
		}
	});

	collector.on("end", (collected, reason) => {
		console.log(`Collected ${collected.size} interactions.`);
		console.log(`Collector terminated for reason: ${reason}.`);
	});
}

// tracker(client) checks for updates in the queue and updates accordingly
function tracker(client) {
	// recursive function for checking past queue
	const checkForUpdate = async function() {

		// check if query is empty
		if (await cbQueue.estimatedDocumentCount() === 0) {
			console.log("Queue empty. Terminating tracker");
			return;
		}
		// query for documents that have a time earlier than set
		const query = {
			date: {
				$lte: moment(),
			},
		};

		// all documents that have a past time
		const results = await cbQueue.find(query);

		for (const post of results) {
			console.log("Starting collector");
			const { date, cbId, day, channelId, messageId, logsId, coordinationId, clanId } = post;

			let newDate = moment();
			// update queue
			if (day < 4) {
				// if not yet last day, add a new doc to the queue for the next day
				console.log("Starting full day");
				newDate = moment(date).add(1, "d");
				await new cbQueue({
					date: newDate,
					cbId: cbId,
					day: (day + 1),
					channelId: channelId,
					messageId: messageId,
					logsId: logsId,
					coordinationId: coordinationId,
					clanId: clanId,
				}).save();
				console.log("Added to queue");
			}
			else if (day === 4) {
				// if last day, add a new doc to the queue for the last day that ends earlier
				console.log("Starting last day");
				newDate = moment(date).utc().add(1, "d").hour(8);
				await new cbQueue({
					date: newDate,
					cbId: cbId,
					day: (day + 1),
					channelId: channelId,
					messageId: messageId,
					logsId: logsId,
					coordinationId: coordinationId,
					clanId: clanId,
				}).save();
			}
			// update collector
			await collectors[clanId].updateCollector();

			// update message
			// retrieve data from embedded document
			const { lap, boss, bossIds } = collectors[clanId].cbData;

			// create an embed based on the cbId and the cbDay
			const embed = createEmbed(cbId, day + 1, newDate.unix(), lap, boss, bossIds);

			// retrieve the message object
			const message = collectors[clanId].message;

			if (day === 5) {
				// end of last day; CB ends
				console.log("Ending CB");

				// set CB to inactive
				const clanData = collectors[clanId].cbData.ownerDocument();
				clanData.cbActive = false;
				clanData.save();

				// stop collector
				collectors[clanId].stop();
				delete collectors[clanId];

				// edit the embed with empty components
				await message.edit({ embeds: [embed], components: [] });
			}
			else {
				// edit the embed
				await message.edit({ embeds: [embed], components: [AddRow, BossRow, RemoveRow, LinkRow(clanId, cbId)] });
			}
		}

		// delete query of past day(s)
		await cbQueue.deleteMany(query);

		// recursively call the function to continue
		setTimeout(checkForUpdate, 1000 * 60);
	};
	// start
	checkForUpdate();
}

module.exports = {

	/**
	 * Updates the data in the CB process
	 * @param {string} guildId
	 */
	updateProcess: async function(guildId) {
		if (collectors[guildId]) {
			await collectors[guildId].updateData(guildId);
		}
	},

	restartProcess: async function(client) {
		// query for documents that have an active CB
		const query = {
			day: {
				$gte: 0,
			},
		};

		// all documents that have are active CBs
		const results = await cbQueue.find(query);

		for (const post of results) {
			console.log("Starting collector");
			const { date, cbId, day, channelId, messageId, logsId, coordinationId, clanId } = post;

			// create collector

			// check if collector already exists
			if (collectors[clanId]) {
				await collectors[clanId].stop();
			}

			// get cb destination channel
			const channel = await client.channels.cache.get(channelId);

			// get cb message
			const message = await channel.messages.fetch(messageId);

			// get logs channel
			const logs = await client.channels.cache.get(logsId);

			// get coordination channel
			const coordination = await client.channels.cache.get(coordinationId);

			// update message

			// get boss data
			const clanData = await clanSchema.findOne({ "clanId": clanId });
			const status = clanData.CBs.find(cb => cb.cbId === cbId);
			if (status === undefined) {
				continue;
			}
			// retrieve data from embedded document
			const { lap, boss, bossIds } = status;
			// create an embed based on the cbId, the cbDay as well as the date

			const embed = createEmbed(cbId, day, moment(date).unix(), lap, boss, bossIds);
			// edit the embed
			if (day === 0) {
				await message.edit({ embeds: [embed], components: [LinkRow(clanId, cbId)] });
			}
			else {
				await message.edit({ embeds: [embed], components: [AddRow, BossRow, RemoveRow, LinkRow(clanId, cbId)] });
			}
			// create a new collector
			collectors[clanId] = new cbCollector(channel, message, logs, coordination, status);
			setCollector(collectors[clanId]);
		}
		// start tracker
		tracker(client);
	},

	startProcess: async function(interaction, cbNumber, startDate, client) {
		const guildId = interaction.guildId;

		// get cb channels
		const logs = interaction.options.getChannel("logs");
		const coordination = interaction.options.getChannel("coordination");
		const channel = interaction.options.getChannel("destination");

		// create an embed based on the cbId, the cbDay as well as the date
		const embed = createEmbed(cbNumber, 0, startDate.unix());
		const message = await channel.send({ embeds: [embed], components: [LinkRow(guildId, cbNumber)] });

		// retrieve cb data
		const clanData = await clanSchema.findOne({ "clanId": guildId });
		const cbData = clanData.CBs.find(cb => cb.cbId === cbNumber);

		console.log("Starting CB for: ");
		console.log(startDate);
		// create collector
		// check if collector already exists
		console.log("Starting collector");
		if (collectors[guildId]) {
			await collectors[guildId].stop();
		}
		// create a new collector
		collectors[guildId] = new cbCollector(channel, message, logs, coordination, cbData);
		setCollector(collectors[guildId]);

		// start day 0 queue
		await new cbQueue({
			date: startDate,
			cbId: cbNumber,
			channelId: channel.id,
			messageId: message.id,
			logsId: logs.id,
			coordinationId: coordination.id,
			clanId: guildId,
		}).save();

		// start tracker
		tracker(client);
	},
};