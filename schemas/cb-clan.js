const mongoose = require("mongoose");

const reqNumber = {
    type: Number,
    required: true
};

const reqString = {
    type: String,
    required: true
};

const playerSchema = new mongoose.Schema({
    "IGN": reqString,
    "userId": reqString,
    "nbAcc": reqNumber
});

const clanSchema = new mongoose.Schema({
    "name": reqString,
    "players": [playerSchema],
    "clanId": reqString,
    "nbAcc": reqNumber
});

const name = "cb-clan";

module.exports = {
    clanSchema: mongoose.model(name, clanSchema, name)
}