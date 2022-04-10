const mongoose = require("mongoose");

const reqNumber = {
    type: Number,
    required: true
};

const reqString = {
    type: String,
    required: true
};


const schema = new mongoose.Schema({
    cbId: reqNumber,
    day: reqNumber,
    IGN: reqString,
    userId: String,
    nbAcc: reqNumber,
    hitsDone: reqNumber,

});

module.exports = mongoose.model("Aquarium", schema, "Aquarium");