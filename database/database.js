// This module creates and modifies database documents

const mongoose = require("mongoose");
const fs = require("node:fs");
const cbSchema = require("../schemas/cb-schema");

module.exports = {
    
    // list of players in Aquarium
    getPlayers: function() {
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
        return listPlayers;
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

                // set tracker
                await new cbSchema({
                    cbId: cbId,
                    day: 1,
                    IGN: "AquariumStatus",
                });
            }
        
        });
    },

    // add hit to Hit List
    cbAddHit: async function (hitCbID, hitDay, hitIGN, callback) {
        // Find the document corresponding to the right CB, the right day and the right player name
        cbSchema.findOne({ cbID: hitCbID, day: hitDay, IGN: hitIGN}, function (err, doc) {
            if (err) {
                console.log("An error has occured when attempting to find a document.");
                callback(err);
            } else {
                if (doc.hitsDone >= (doc.nbAcc * 3)) {
                    callback("All hits done");
                } else {
                    cbSchema.updateOne({ cbID: hitCbID, day: hitDay, IGN: hitIGN}, 
                        { $inc: { hitsDone: 1 } }, function (err, doc) {
                            if (err) {
                                console.log("Error adding hit");
                                callback(err);
                            } else {
                                console.log("Added hit");
                                callback("Added hit");
                            }
                        });
                    }
                }
        });
    },
}