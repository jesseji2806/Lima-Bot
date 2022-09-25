const mongoose = require("mongoose");
const cbSchema = require("../schemas/cb-schema");
const cbQueue = require("../schemas/cb-queue");
const { idToIGN, hitsToPrint, cbAddHit, cbRemoveHit, cbKillBoss } = require("../database/database");
const { createEmbed, AddRow, BossRow, RemoveRow, LinkRow, PingKoishiRow } = require("../functions/cb-button");
const moment = require("moment");

class cbCollector {
	constructor(cbNumber, cbDay, boss, channel, message, logs, coordination) {
		this.collector = channel.createMessageComponentCollector({ componentType: "BUTTON" });
		this.cbId = cbNumber;
		this.cbDay = cbDay;
		this.boss = boss;
		this.channel = channel;
		this.message = message;
		this.logs = logs;
		this.coordination = coordination;
        
	}
	async stop() {
		await this.collector.stop("cb stopped");
	}
	updateCollector() {
		this.cbDay += 1;
	}
}

const collectors = {};

function collectorFunc(i, type, collector, playerHit, nbHits) {
	let { cbId, cbDay, boss, logs } = collector;
	if (type === "add") {
		cbAddHit(cbId, cbDay, playerHit, nbHits, boss, async function(retval) {
			if (Number.isInteger(retval)) {
				const printHits = hitsToPrint(nbHits);
				const printRet = hitsToPrint(retval);
				await i.editReply({ content: `Added ${printHits} to ${playerHit} on day ${cbDay}.\nYou have ${printRet} on day ${cbDay}.`});
                
				// logging
				await logs.send({ "content": `(CB${cbId}) ${i.user.tag} added ${printHits} to ${playerHit} on day ${cbDay}. Total: ${printRet}` });
				return;
			} else if (retval === "All hits done") {
				await i.editReply({ content: `Player has already hit all hits for day ${cbDay}.`});
				return;
			} else if (retval === "Too many hits") {
				await i.editReply({ content: "You are trying to add too many hits at once."});
				return;
			} else {
				await i.editReply({ content: "An error has occured while adding hit."});
				return;
			}
		});
	} else if (type === "remove") {
		cbRemoveHit(cbId, cbDay, playerHit, nbHits, async function(retval) {
			if (Number.isInteger(retval)) {
				const printHits = hitsToPrint(nbHits);
				const printRet = hitsToPrint(retval);
				await i.editReply({ content: `Removed ${printHits} from ${playerHit} on day ${cbDay}.\nYou have ${printRet} on day ${cbDay}.`});
                
				// logging
				await logs.send({ "content": `(CB${cbId}) ${i.user.tag} removed ${printHits} from ${playerHit} on day ${cbDay}. Total: ${printRet}` });
				return;
			} else if (retval === "No hits to remove") {
				await i.editReply({ content: `Player has no hits on day ${cbDay}.`});
				return;
			} else if (retval === "Too many hits") {
				await i.editReply({ content: "You are trying to remove too many hits at once." });
				return;
			} else {
				await i.editReply({ content: "An error has occured while removing hit."});
				return;
			}
		});
	}
}

async function setCollector(newCollector) {

	const collector = newCollector.collector;
	// define the collector function
	collector.on("collect", async function (i) {
		let playerHit = idToIGN(i.user.id, i.guildId);
		let { cbId, cbDay } = newCollector;
		await i.deferReply({ ephemeral: true });
		if (!playerHit) {
			await i.editReply({ content: "You are not in Aquarium!" });
			return;
		}
		// adding hits
		if (i.customId === "add-hit-1") {
			collectorFunc(i, "add", newCollector, playerHit, 1);
		} else if (i.customId === "add-hit-2") {
			collectorFunc(i, "add", newCollector, playerHit, 2);
		} else if (i.customId === "add-hit-all") {
			const player = await cbSchema.findOne({ cbId: cbId, day: cbDay, IGN: playerHit });
			const hitsToAdd = (player.nbAcc * 3) - player.hitsDone;
			collectorFunc(i, "add", newCollector, playerHit, hitsToAdd);
		} 
		// removing hits
		else if (i.customId === "remove-hit-1") {
			collectorFunc(i, "remove", newCollector, playerHit, 1);
		} else if (i.customId === "remove-hit-2") {
			collectorFunc(i, "remove", newCollector, playerHit, 2);
		} else if (i.customId === "remove-hit-all") {
			const player = await cbSchema.findOne({ cbId: cbId, day: cbDay, IGN: playerHit });
			const hitsToRemove = player.hitsDone;
			collectorFunc(i, "remove", newCollector, playerHit, hitsToRemove);
		}
		// killing boss
		else if (i.customId === "boss-killed") {
			const toPing = await cbKillBoss(cbId, true);
			await i.editReply("Boss Kill registered. Good work!");
			// updating message
			// getting status and queue data
			const statusData = await cbSchema.findOne({ "IGN": "AquariumStatus" });
			const queueData = await cbQueue.findOne({ "cbId": cbId });
			const { lap, boss, bossIds } = statusData;
			const { date } = queueData;

			// update collector
			newCollector.boss = boss;
            
			// create an embed based on the cbId and the cnDday
			const embed = createEmbed(cbId, cbDay, moment(date).unix(), lap, boss, bossIds);

			// edit the embed
			await newCollector.message.edit({ embeds: [embed], components: [AddRow, BossRow, RemoveRow, LinkRow(cbId)] });

			// logging
			await newCollector.logs.send({ "content": `(CB${cbId}) ${i.user.tag} killed a boss. Moving to Lap ${lap}, Boss ${boss}. `});

			// pinging
			if (toPing.length > 0) {
				let coordPing = `Pinging players who wish to hit boss ${boss}:`;
				for (const post of toPing) {
					const user = post.userId;
					if (user) {
						coordPing += `<@${user}>, `;
					}
				}
				coordPing += `boss ${boss} is up!`;
				await newCollector.coordination.send({ "content": coordPing });
			}
		}
		else if (i.customId === "undo-boss-kill") {
			const toPing = await cbKillBoss(cbId, false);
			if (toPing === "Cannot remove") {
				await i.editReply("Cannot undo boss kill");
				return;
			}
			else {
				await i.editReply("Undid boss kill.");
				// updating message
				// getting status and queue data
                
				const statusData = await cbSchema.findOne({ "IGN": "AquariumStatus" });
				const queueData = await cbQueue.findOne({ "cbId": cbId });
				const { lap, boss, bossIds } = statusData;
				const { date } = queueData;
    
				// update collector
				newCollector.boss = boss;
                
				// create an embed based on the cbId and the cnDday
				const embed = createEmbed(cbId, cbDay, moment(date).unix(), lap, boss, bossIds);
    
				// edit the embed
				await newCollector.message.edit({ embeds: [embed], components: [AddRow, BossRow, RemoveRow, LinkRow(cbId)] });
    
				// logging
				await newCollector.logs.send({ "content": `(CB${cbId}) ${i.user.tag} undid a boss kill. Returning to Lap ${lap}, Boss ${boss}. `});
    
				// pinging
				if (toPing.length > 0) {
					let coordPing = `Pinging players who wish to hit boss ${boss}:`;
					for (const post of toPing) {
						const user = post.userId;
						if (user) {
							coordPing += `<@${user}>, `;
						}
					}
					coordPing += `boss ${boss} is up!`;
					await newCollector.coordination.send({ "content": coordPing });
				}
			}
		} 
		else if (i.customId === "ping-koishi") {
			await newCollector.logs.send({ "content": `(CB${cbId}) ${i.user.tag} pinged leader <@386577302546546689>.` });
		}
	});

	collector.on('end', (collected, reason) => {
		console.log(`Collected ${collected.size} interactions.`);
		console.log(`Collector terminated for reason: ${reason}.`);
	});
};

// tracker(client) checks for updates in the queue and updates accordingly
function tracker(client) {
	// recursive function for checking past queue
	const checkForUpdate = async function () {

		// check if query is empty
		if (await cbQueue.estimatedDocumentCount() === 0) {
			console.log("Queue empty. Terminating tracker");
			return;
		}
		// query for documents that have a time earlier than set
		const query = {
			date: {
				$lte: moment()
			}
		};

		// all documents that have a past time (in general, should only be 1 doc at most)
		const results = await cbQueue.find(query);

		for (const post of results) {
			console.log("Starting collector");
			const { date, cbId, day, channelId, messageId, logsId, coordinationId } = post;

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
				}).save();
				console.log("Added to queue");
			} else if (day === 4) {
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
				}).save();
			}
			// update collector
			collectors[channelId].updateCollector();
			// update embed
			// get boss data and update status tracker
			const status = await cbSchema.findOneAndUpdate({ "IGN": "AquariumStatus" }, { $inc: { day: 1 } });
			const { lap, boss, bossIds } = status;
			// create an embed based on the cbId and the cbDay
			const embed = createEmbed(cbId, day + 1, newDate.unix(), lap, boss, bossIds);

			// retrieve the message object
			const message = collectors[channelId].message;

			if (day === 5) {
				// end of last day; CB ends
				console.log("Ending CB");
				collectors[channelId].stop();
				delete collectors[channelId];
				// edit the embed with empty components
				await message.edit({ embeds: [embed], components: [] });
			} else {
				// edit the embed
				await message.edit({ embeds: [embed], components: [AddRow, BossRow, RemoveRow, LinkRow(cbId), PingKoishiRow] });
			}
		}

		// delete query of past day(s)
		await cbQueue.deleteMany(query);

		// recursively call the function to continue
		setTimeout(checkForUpdate, 1000 * 60);
	}
	// start
	checkForUpdate();
}

module.exports = {

	restartProcess: async function (client) {
		// query for documents that have an active CB
		const query = {
			day: {
				$gte: 0
			}
		};

		// all documents that have are active CBs
		const results = await cbQueue.find(query);

		for (const post of results) {
			console.log("Starting collector");
			const { date, cbId, day, channelId, messageId, logsId, coordinationId } = post;

			// create collector
			// check if collector already exists
			if (collectors[channelId]) {
				await collectors[channelId].stop();
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
			const status = await cbSchema.findOne({ "IGN": "AquariumStatus" });
			if (!status) {
				return;
			}
			const { lap, boss, bossIds } = status;
			// create an embed based on the cbId, the cbDay as well as the date

			const embed = createEmbed(cbId, day, moment(date).unix(), lap, boss, bossIds);
			// edit the embed
			if (day === 0) {
				await message.edit({ embeds: [embed], components: [LinkRow(cbId)] });
			} else {
				await message.edit({ embeds: [embed], components: [AddRow, BossRow, RemoveRow, LinkRow(cbId)] });
			}
			// create a new collector
			collectors[channelId] = new cbCollector(cbId, day, boss, channel, message, logs, coordination);
			setCollector(collectors[channelId]);
		}
		// start tracker
		tracker(client);
	},

	startProcess: async function (interaction, cbNumber, startDate, client) {
		// get cb channels
		const logs = interaction.options.getChannel("logs");
		const coordination = interaction.options.getChannel("coordination");
		const channel = interaction.options.getChannel("destination");
		const destId = channel.id;
        
		// create an embed based on the cbId, the cbDay as well as the date
		const embed = createEmbed(cbNumber, 0, startDate.unix());
		const message = await channel.send({ embeds: [embed], components: [LinkRow(cbNumber)] });

		console.log("Starting CB for: ");
		console.log(startDate);
		// create collector
		// check if collector already exists
		console.log("Starting collector");
		if (collectors[destId]) {
			await collectors[destId].stop();
		}
		// create a new collector
		collectors[destId] = new cbCollector(cbNumber, 0, 1, channel, message, logs, coordination);
		setCollector(collectors[destId]);

		// start day 0 queue
		await new cbQueue({
			date: startDate,
			cbId: cbNumber,
			day: 0,
			channelId: destId,
			messageId: message.id,
			logsId: logs.id,
			coordinationId: coordination.id,
		}).save();

		// start tracker
		tracker(client);
	},
}