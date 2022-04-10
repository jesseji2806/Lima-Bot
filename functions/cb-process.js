const mongoose = require("mongoose");
const cbSchema = require("../schemas/cb-schema");
const cbQueue = require("../schemas/cb-queue");
const { idToIGN, cbAddHit } = require("../database/database");
const { createEmbed, row } = require("../functions/cb-button");
const moment = require("moment");

class cbCollector {
    constructor(cbNumber, cbDay, channel, message) {
        this.collector = channel.createMessageComponentCollector({ componentType: "BUTTON" });
        this.cbId = cbNumber;
        this.cbDay = cbDay;
        this.channel = channel;
        this.message = message;
        
    }
    async stop() {
        await this.collector.stop();
    }
    updateCollector() {
        this.cbDay += 1;
    }
}

const collectors = {};

async function setCollector(newCollector) {

    const collector = newCollector.collector;
    // define the collector function
    collector.on("collect", async function (i) {
        let playerHit = idToIGN(i.user.id);
        let { cbId, cbDay } = newCollector;
        await i.deferReply({ ephemeral: true });
        if (!playerHit) {
            await i.editReply({ content: "You are not in Aquarium!" });
            return;
        }
        if (i.customId === "add-hit") {
            cbAddHit(cbId, cbDay, playerHit, async function (retval) {
                if (retval === "Added hit") {
                    await i.editReply({ content: `Added hit to ${playerHit} on day ${cbDay}.` });
                    return;
                } else if (retval === "All hits done") {
                    await i.editReply({ content: `You have already hit all hits for day ${cbDay}.` });
                    return;
                } else {
                    await i.editReply({ content: "An error has occured while adding hit." });
                    return;
                }
            });
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
        console.log("Checking for update...");

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
        if (results.lenghth === 0) {
            console.log("No updates");
        }

        for (const post of results) {
            console.log("Starting collector");
            const { date, cbId, day, channelId, messageId } = post;

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
                }).save();
            }
            // update collector
            collectors[channelId].updateCollector();
            // update embed
            // create an embed based on the cbId and the cbDay
            const embed = createEmbed(cbId, day + 1, newDate.unix());

            // retrieve the message object
            const message = collectors[channelId].message;

            // update status tracker
            await cbSchema.updateOne({ IGN: "AquariumStatus" }, { $inc: { day: 1 } });

            if (day === 5) {
                // end of last day; CB ends
                console.log("Ending CB");
                collectors[channelId].stop();
                collectors.delete(channelId);
                // edit the embed with empty components
                await message.edit({ embeds: [embed], components: [] });
            } else {
                // edit the embed
                await message.edit({ embeds: [embed], components: [row] });
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
            const { date, cbId, day, channelId, messageId } = post;

            // create collector
            // check if collector already exists
            if (collectors[channelId]) {
                await collectors[channelId].stop();
            }
            // get cb destination channel
            const channel = await client.channels.cache.get(channelId);

            // get cb message
            const message = await channel.messages.fetch(messageId);

            // update message
            // create an embed based on the cbId, the cbDay as well as the date

            const embed = createEmbed(cbId, day, moment(date).unix());
            // edit the embed
            if (day === 0) {
                await message.edit({ embeds: [embed], components: [] });
            } else {
                await message.edit({ embeds: [embed], components: [row] });
            }
            // create a new collector
            collectors[channelId] = new cbCollector(cbId, day, channel, message);
            setCollector(collectors[channelId]);
        }
        // start tracker
        tracker(client);
    },

    startProcess: async function (interaction, cbNumber, startDate, client) {
        // get cb destination channel
        const destId = interaction.options.getChannel("destination").id;
        const channel = client.channels.cache.get(destId);

        // create an embed based on the cbId, the cbDay as well as the date
        const embed = createEmbed(cbNumber, 0, startDate.unix());
        const message = await channel.send({ embeds: [embed] });

        console.log("Starting CB for: ");
        console.log(startDate);
        // create collector
        // check if collector already exists
        console.log("Starting collector");
        if (collectors[destId]) {
            await collectors[destId].stop();
        }
        // create a new collector
        collectors[destId] = new cbCollector(cbNumber, 0, channel, message);
        setCollector(collectors[destId]);

        // start day 0 queue
        await new cbQueue({
            date: startDate,
            cbId: cbNumber,
            day: 0,
            channelId: destId,
            messageId: message.id,
        }).save();

        // start tracker
        tracker(client);
    },
}