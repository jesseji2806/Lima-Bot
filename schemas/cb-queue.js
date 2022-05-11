const mongoose = require("mongoose");

const reqNumber = {
    type: Number,
    required: true
};

const reqString = {
    type: String,
    required: true
};

const queue = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    cbId: reqNumber,
    day: reqNumber,
    channelId: reqString,
    messageId: reqString,
    logsId: reqString,
});

const name = "cb-queue";

module.exports = mongoose.model(name, queue, name);