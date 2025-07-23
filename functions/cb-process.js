const { MessageFlags, ComponentType } = require("discord.js");
const { clanSchema } = require("../schemas/cb-clan");
const cbQueue = require("../schemas/cb-queue");
const { idToIGN, hitsToPrint, cbAddHit, cbRemoveHit, isPlayer, getClanId } = require("../database/database");
const { AddHitReturnValues, RemoveHitReturnValues } = require("../database/retval");
const { createEmbed, AddRow, RemoveRow } = require("../functions/cb-button");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

class cbCollector {
	constructor(channel, message, logs, coordination, cbData) {
		this.collector = message.createMessageComponentCollector({ componentType: ComponentType.Button });
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

	async updateData(clanId) {
		const clanData = await clanSchema.findById(clanId);
		this.cbData = clanData.CBs.find(cb => cb.cbId === this.cbData.cbId);
	}
}

const collectors = {};
let trackerInterval = null;

async function collectorFunc(i, type, collector, playerHit, nbHits) {
	const { cbData, logs } = collector;
	const { cbId, day } = cbData;
	const { _id: clanId } = cbData.ownerDocument();
	if (type === "add") {
		const retval = await cbAddHit(cbData, day, playerHit, nbHits);
		if (retval.status === AddHitReturnValues.ALREADY_COMPLETED) {
			await i.editReply({ content: `Player has already hit all hits for day ${day}.` });
			return;
		}
		else if (retval.status === AddHitReturnValues.INVALID_AMOUNT) {
			await i.editReply({ content: "You are trying to add too many hits at once." });
			return;
		}
		else if ("hitsDone" in retval) {
			// format hits for printing
			const printPlayer = await idToIGN(playerHit, clanId);
			console.log(`Adding ${nbHits} hits to player ${playerHit} on day ${day}.`);
			const printHits = hitsToPrint(nbHits);
			const printRet = hitsToPrint(retval.hitsDone);

			// send reply
			await i.editReply({ content: `Added ${printHits} to ${printPlayer} on day ${day}.\nYou have ${printRet} on day ${day}.` });

			// logging
			await logs.send({ "content": `(CB${cbId}) ${i.user.tag} added ${printHits} to ${printPlayer} on day ${day}. Total: ${printRet}` });

			// additional log message if all hits completed
			if (retval.status === AddHitReturnValues.COMPLETE) {
				await logs.send({ "content": `(CB${cbId}) ${printPlayer} has completed all ${printRet} on day ${day}! Good work!` });
			}
			return;
		}
		else {
			await i.editReply({ content: "An error has occured while adding hit." });
			return;
		}
	}
	else if (type === "remove") {
		const retval = await cbRemoveHit(cbData, day, playerHit, nbHits);
		if (retval.status === RemoveHitReturnValues.NO_HITS) {
			await i.editReply({ content: `Player has no hits on day ${day}.` });
			return;
		}
		else if (retval.status === RemoveHitReturnValues.INVALID_AMOUNT) {
			await i.editReply({ content: "You are trying to remove too many hits at once." });
			return;
		}
		else if (retval.status === RemoveHitReturnValues.SUCCESS) {
			// format hits for printing
			const printPlayer = await idToIGN(playerHit, clanId);
			const printHits = hitsToPrint(nbHits);
			const printRet = hitsToPrint(retval.hitsDone);

			// send reply
			await i.editReply({ content: `Removed ${printHits} from ${printPlayer} on day ${day}.\nYou have ${printRet} on day ${day}.` });

			// logging
			await logs.send({ "content": `(CB${cbId}) ${i.user.tag} removed ${printHits} from ${printPlayer} on day ${day}. Total: ${printRet}` });
			return;
		}
		else {
			await i.editReply({ content: "An error has occured while removing hit." });
			return;
		}
	}
}

async function setCollector(newCollector) {

	const collector = newCollector.collector;
	// define the collector function
	collector.on("collect", async function(i) {
		const playerHit = i.user.id;
		const { cbData } = newCollector;
		const { day: cbDay, _id: clanId } = cbData;

		await i.deferReply({ flags: MessageFlags.Ephemeral });
		if (await !isPlayer(i.user.id, clanId) && i.customId !== "boss-killed" && i.customId !== "undo-boss-kill") {
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
	});

	collector.on("end", (collected, reason) => {
		console.log(`Collected ${collected.size} interactions.`);
		console.log(`Collector terminated for reason: ${reason}.`);
	});
}

// tracker() checks for updates in the queue and updates accordingly
function tracker() {
	// Prevent multiple trackers
	if (trackerInterval) {
		console.log("Tracker already running, restarting tracker.");
		stopTracker();
	}

	const checkForUpdate = async function() {
		try {
			// check if query is empty
			if (await cbQueue.estimatedDocumentCount() === 0) {
				console.log("Queue empty. Stopping tracker");
				clearInterval(trackerInterval);
				trackerInterval = null;
				return;
			}

			// query for documents that have a time earlier than set
			const query = {
				date: {
					$lte: dayjs.utc(),
				},
			};

			// all documents that have a past time
			const results = await cbQueue.find(query);

			for (const post of results) {
				console.log("Starting collector");
				const { date, cbId, day, channelId, messageId, logsId, coordinationId, clanId } = post;

				let newDate = dayjs.utc();
				// update queue
				if (day < 4) {
					// if not yet last day, add a new doc to the queue for the next day
					console.log("Starting full day");
					newDate = dayjs.utc(date).add(1, "d");
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
					newDate = dayjs.utc(date).add(1, "d").hour(15);
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
					await message.edit({ embeds: [embed], components: [AddRow, RemoveRow] });
				}
			}

			// delete query of past day(s)
			await cbQueue.deleteMany(query);

		}
		catch (error) {
			console.error("Error in tracker:", error);
		}
	};

	// Run immediately, then every minute
	checkForUpdate();
	trackerInterval = setInterval(checkForUpdate, 1000 * 60);
}

// Add a function to stop the tracker
function stopTracker() {
	if (trackerInterval) {
		clearInterval(trackerInterval);
		trackerInterval = null;
		console.log("Tracker stopped");
	}
}

module.exports = {

	/**
	 * Updates the data in the CB process
	 * @param {string} clanId
	 */
	updateProcess: async function(clanId) {
		if (clanId && collectors[clanId]) {
			await collectors[clanId].updateData(clanId);
		}
	},

	/**
	 * Stops the tracker interval
	 */
	stopTracker: function() {
		stopTracker();
	},

	restartProcess: async function(client) {
		// Stop any existing tracker first
		stopTracker();

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
			const coordination = coordinationId ? await client.channels.cache.get(coordinationId) : null;

			// update message

			// get boss data
			const clanData = await clanSchema.findById(clanId);
			const status = clanData.CBs.find(cb => cb.cbId === cbId);
			if (status === undefined) {
				continue;
			}
			// retrieve data from embedded document
			const { lap, boss, bossIds } = status;
			// create an embed based on the cbId, the cbDay as well as the date

			const embed = createEmbed(cbId, day, dayjs(date).unix(), lap, boss, bossIds);
			// edit the embed
			if (day === 0) {
				await message.edit({ embeds: [embed] });
			}
			else {
				await message.edit({ embeds: [embed], components: [AddRow, RemoveRow] });
			}
			// create a new collector
			collectors[clanData._id] = new cbCollector(channel, message, logs, coordination, status);
			setCollector(collectors[clanData._id]);
		}
		// start tracker
		tracker();
	},

	startProcess: async function(interaction, cbNumber, startDate) {
		const clanId = await getClanId(interaction);

		// get cb channels
		const logs = interaction.options.getChannel("logs");
		const coordination = null;
		const channel = interaction.options.getChannel("destination");

		// create an embed based on the cbId, the cbDay as well as the date
		const embed = createEmbed(cbNumber, 0, startDate.unix());
		const message = await channel.send({ embeds: [embed], withResponse: true });

		// retrieve cb data
		const clanData = await clanSchema.findById(clanId);
		const cbData = clanData.CBs.find(cb => cb.cbId === cbNumber);

		console.log("Starting CB for: ");
		console.log(startDate.format("DD-MM-YYYY"));
		// create collector
		// check if collector already exists
		console.log("Starting collector");
		if (collectors[clanData._id]) {
			await collectors[clanData._id].stop();
		}
		// create a new collector
		collectors[clanData._id] = new cbCollector(channel, message, logs, coordination, cbData);
		setCollector(collectors[clanData._id]);

		// start day 0 queue
		await new cbQueue({
			date: startDate,
			cbId: cbNumber,
			channelId: channel.id,
			messageId: message.id,
			logsId: logs.id,
			coordinationId: null,
			clanId: clanData._id,
		}).save();

		// start tracker
		tracker();
	},
};