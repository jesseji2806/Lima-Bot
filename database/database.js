// This module creates and modifies database documents

const mongoose = require("mongoose");
const fs = require("node:fs");
const cbSchema = require("../schemas/cb-schema");

// get list of players
const data = fs.readFileSync("database/Aquarium.json");

// parse JSON string to JSON object
const databases = JSON.parse(data);
const listPlayers = [{}, {}];
databases.forEach(function (db) {
    if (db.IGN !== "Aquarium" && db.IGN !== "AquariumStatus") {
        listPlayers[0][db.IGN] = db.userID;
        if (db.userID) {
            listPlayers[1][db.userID] = db.IGN;
        }
    }
});

module.exports = {
    
    // IGN => Discord id
    IGNToId: function(IGN) {
        return listPlayers[0][IGN];
    },

    // Discord id => IGN
    idToIGN: function(id) {
        return listPlayers[1][id];
    },

    // create CB documents
    createCB: async function(cbId) {
        fs.readFile("database/Aquarium.json", async function (err, data) {

            if (err) {
                console.log(`Error reading file from disk: ${err}`);
            } else {
        
                // parse JSON string to JSON object
                const databases = JSON.parse(data);
        
                // create CB documents for 5 days
                databases.forEach(async db => {
                    for (let i = 1; i <= 5; ++i) {
                        await new cbSchema({
                            cbId: cbId,
                            day: i,
                            IGN: db.IGN,
                            userID: db.userID,
                            nbAcc: db.nbAcc,
                            hitsDone: 0,    
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
                }).save();
            }
        
        });
    },

    // add hit to Hit List
    cbAddHit: async function (hitCbID, hitDay, hitIGN, callback) {
        // Find the document corresponding to the right CB, the right day and the right player name
        const doc = await cbSchema.findOne({ cbId: hitCbID, day: hitDay, IGN: hitIGN });

        if (doc.hitsDone >= (doc.nbAcc * 3)) {
            callback("All hits done");
        } else {
            await cbSchema.updateOne({ cbId: hitCbID, day: hitDay, IGN: hitIGN}, { $inc: { hitsDone: 1 } });
            await cbSchema.updateOne({ cbId: hitCbID, day: hitDay, IGN: "Aquarium"}, { $inc: { hitsDone: 1 } });
            console.log("Added hit");
            callback("Added hit");
        }
    },
}