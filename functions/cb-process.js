const mongoose = require("mongoose");
const cbSchema = require("../schemas/cb-schema");
const cbQueue = require("../schemas/cb-queue");
const { idToIGN, cbAddHit } = require("../database/database");
const { createEmbed, row } = require("../functions/cb-button");
const moment = require("moment");


async function setCollector (cbNumber, cbDay, channelId, client, ...args) {
        
    // get channel object using the channel id
    const channel = client.channels.cache.get(channelId);

    if (cbDay === 0) {
        // create an embed based on the cbId, the cbDay as well as the date
        const startDate = args[0];
        const embed = createEmbed(cbNumber, cbDay, startDate);
        const message = await channel.send({ embeds: [embed] });
        return message;
    } else if (cbDay === 6) {
        // cb end
        // create an embed based on the cbId and the cbDay
        const embed = createEmbed(cbNumber, cbDay);

        // retrieve the message object
        const message = args[0]

        // edit the embed with empty components
        await message.edit({ embeds: [embed], components: [] });
    } else {
        // create an embed based on the cbId and the cbDay
        const embed = createEmbed(cbNumber, cbDay);

        // retrieve the message object
        const message = args[0]

        // edit the embed
        await message.edit({ embeds: [embed], components: [row] });

        // create a new collector
        let collTime = 24 * 60 * 60 * 1000;
        if (cbDay == 5) {
            collTime = 19 * 60 * 60 * 1000;
        }

        const collector = channel.createMessageComponentCollector({ componentType: "BUTTON", time: collTime });

        collector.on("collect", async function (i) {
            let playerHit = idToIGN(i.user.id);
            if (i.customId === "add-hit") {
                await i.deferReply({ ephemeral: true });
                cbAddHit(cbNumber, cbDay, playerHit, async function(retval) {
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

        collector.on('end', collected => {
            console.log(`Collected ${collected.size} interactions.`);
        });
    }
};

function tracker (message, client) {
    // recursive function for checking past queue
    const checkForUpdate = async function () {
        console.log("Checking for update...");
        // query for documents that have a time earlier than set
        const query = {
            date: {
                $lte: moment().unix()
            }
        };

        // all documents that have a past time (in general, should only be 1 doc at most)
        const results = await cbQueue.find(query);

        for (const post of results) {
            console.log("Starting collector");
            const { date, cbId, day, channelId } = post;
            if (day < 4) {
                // if not yet last day, add a new doc to the queue for the next day
                console.log("Starting full day");
                const newDate = moment.unix(date).add(1, "d").unix();
                await new cbQueue({
                    date: newDate,
                    cbId: cbId,
                    day: (day + 1),
                    channelId: channelId,
                }).save();
                console.log("Added to queue");
            } else if (day === 4) {
                // if last day, add a new doc to the queue for the last day that ends earlier
                const newDate = moment.unix(date).utc().add(1, "d").hour(8).unix();
                await new cbQueue({
                    date: newDate,
                    cbId: cbId,
                    day: (day + 1),
                    channelId: channelId,
                }).save();
            }
            if (day < 5) {
                // create a new collector if not the last day
                await setCollector(cbId, day + 1, channelId, client, message);

                // update status tracker
                await cbSchema.updateOne({ IGN: "AquariumStatus" }, { $inc: { day: 1 } });
            } else {
                // end of last day; CB ends
                console.log("Ending CB");
                await setCollector(cbId, 6, channelId, client, message);
                await cbQueue.deleteMany(query);
                return;
            }
            await cbQueue.deleteMany({ day: { $lte: day} });
        }

        // delete query of past day(s)
        // await cbQueue.deleteMany(query);

        // recursively call the function to continue
        setTimeout(checkForUpdate, 1000 * 60);
    }
    // start
    checkForUpdate();
}

module.exports = {

    startProcess: async function (interaction, cbNumber, startDate, client) {
        // get cb destination channel
        const destId = interaction.options.getChannel("destination").id;

        // start day 0 queue
        await new cbQueue({
            date: startDate.unix(),
            cbId: cbNumber,
            day: 0,
            channelId: destId,
        }).save();

        // start tracker
        const message = await setCollector(cbNumber, 0, destId, client, startDate.unix());
        tracker(message, client);
    },
}