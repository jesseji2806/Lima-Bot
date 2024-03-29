// This module creates and modifies database documents

const mongoose = require("mongoose");
const fs = require("node:fs");
const { kill } = require("node:process");
const cbSchema = require("../schemas/cb-schema");
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
    else{
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
        })
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
    isPlayer: function(player, clanId) {
        return player in listPlayers[clanId].IGNToId || player in listPlayers[clanId].idToIGN;
    },

    // IGN => Discord id
    IGNToId: function(IGN, clanId) {
        return listPlayers[clanId].IGNToId[IGN];
    },

    // Discord id => IGN
    idToIGN: function(id, clanId) {
        return listPlayers[clanId].idToIGN[id];
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

        const { players, name } = clanData;

        // Add clan information
        players.push({
            IGN: name,
            nbAcc: players.length
        });

        // Create document for each player
        players.forEach(player => {
            for (let i = 1; i <= 5; ++i) {
                new cbSchema({
                    cbId: cbId,
                    day: i,
                    IGN: player.IGN,
                    userId: player.userId,
                    nbAcc: player.nbAcc,
                    hitsDone: 0,
                    bossIds: [],
                    ping: true,    
                }).save();
            }
        });

        //
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
    cbKillBoss: async function (killCbId, add) {
        const doc = await cbSchema.findOne({ "cbId": killCbId, "IGN": "AquariumStatus" });
        let { lap, boss, day } = doc;
        if (boss === 5 && add) {
            boss = 1;
            ++lap;
        } else if (add) {
            ++boss;
        } else if (lap === 1 && boss === 1 && !add) {
            return "Cannot remove";
        } else if (boss === 1 && !add) {
            --lap;
            boss = 5;
        } else if (!add) {
            --boss;
        }
        await cbSchema.updateOne({ cbId: killCbId, "IGN": "AquariumStatus"}, { $set: { lap: lap, boss: boss } });
        console.log("Killed Boss");
        const pings = await cbSchema.find({ "cbId": killCbId, "day": day, "IGN": { $ne: "AquariumStatus" }, "bossIds": boss }, { "_id": 0, "userId": 1 }, { sort: { "_id": 1 } });
        return pings;
    }
}