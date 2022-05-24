// This module creates and modifies database documents

const mongoose = require("mongoose");
const fs = require("node:fs");
const { kill } = require("node:process");
const cbSchema = require("../schemas/cb-schema");

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

module.exports = {
    isPlayer: function(player) {
        return player in listPlayers[0] || player in listPlayers[1];
    },

    // IGN => Discord id
    IGNToId: function(IGN) {
        return listPlayers[0][IGN];
    },

    // Discord id => IGN
    idToIGN: function(id) {
        return listPlayers[1][id];
    },

    // Hits number => Printable
    hitsToPrint: function(nbHits) {
        let printHits = nbHits.toString();
        if (nbHits === 1) {
            printHits += " hit";
        } else {
            printHits += " hits";
        }
        return printHits;
    },

    // create CB documents
    createCB: async function(cbId, bossIds, logs, coordination) {
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
    },

    // add hit to Hit List
    cbAddHit: async function (hitCbID, hitDay, hitIGN, hitsToAdd, bossId, callback) {
        // Find the document corresponding to the right CB, the right day and the right player name
        const doc = await cbSchema.findOne({ cbId: hitCbID, day: hitDay, IGN: hitIGN });

        if (doc.hitsDone >= (doc.nbAcc * 3)) {
            callback("All hits done");
        } else if ((doc.hitsDone + hitsToAdd) > (doc.nbAcc * 3)) {
            callback("Too many hits");
        } else {
            await cbSchema.updateOne({ "cbId": hitCbID, "day": hitDay, "IGN": hitIGN}, { $inc: { "hitsDone": hitsToAdd }, $pull: { "bossIds": bossId } });
            await cbSchema.updateOne({ "cbId": hitCbID, "day": hitDay, "IGN": "Aquarium"}, { $inc: { "hitsDone": hitsToAdd } });
            console.log(`Added ${hitsToAdd} hit(s) to ${hitIGN}`);
            callback(doc.hitsDone + hitsToAdd);
        }
    },
    // remove hit from Hit List
    cbRemoveHit: async function (hitCbID, hitDay, hitIGN, hitsToRemove, callback) {
        // Find the document corresponding to the right CB, the right day and the right player name
        const doc = await cbSchema.findOne({ cbId: hitCbID, day: hitDay, IGN: hitIGN });

        if (doc.hitsDone === 0) {
            callback("No hits to remove");
        } else if ((doc.hitsDone - hitsToRemove) < 0) {
            callback("Too many hits");
        } else {
            await cbSchema.updateOne({ cbId: hitCbID, day: hitDay, IGN: hitIGN}, { $inc: { hitsDone: (-1 * hitsToRemove) } });
            await cbSchema.updateOne({ cbId: hitCbID, day: hitDay, IGN: "Aquarium"}, { $inc: { hitsDone: (-1 * hitsToRemove) } });
            console.log(`Removed ${hitsToRemove} hit(s) to ${hitIGN}`);
            callback(doc.hitsDone - hitsToRemove);
        }
    },

    // kill boss in boss tracker
    cbKillBoss: async function (killCbId) {
        const doc = await cbSchema.findOne({ "cbId": killCbId, "IGN": "AquariumStatus" });
        let { lap, boss, day } = doc;
        if (boss === 5) {
            boss = 1;
            ++lap;
        } else {
            ++boss;
        }
        await cbSchema.updateOne({ cbId: killCbId, "IGN": "AquariumStatus"}, { $set: { lap: lap, boss: boss } });
        console.log("Killed Boss");
        const pings = await cbSchema.find({ "cbId": killCbId, "day": day, "IGN": { $ne: "AquariumStatus" }, "bossIds": boss }, { "_id": 0, "userId": 1 }, { sort: { "_id": 1 } });
        return pings;
    }
}