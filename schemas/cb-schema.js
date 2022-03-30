const mongoose = require("mongoose");

const reqNumber = {
    type: Number,
    required: true
};

const reqString = {
    type: String,
    required: true
};

const reqBoolean = {
    type: Boolean,
    required: true
};

const schema = new mongoose.Schema({
    cbId: reqNumber,
    day: reqNumber,
    IGN: reqString,
    user: reqString,
    first: reqBoolean,
    second: reqBoolean,
    third: reqBoolean,
});

module.exports = mongoose.model("Aquarium", schema, "Aquarium");