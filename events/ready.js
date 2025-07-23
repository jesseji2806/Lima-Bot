const { Events } = require("discord.js");
const mongoose = require("mongoose");
require("dotenv").config();
const database_uri = process.env.DATABASE_URI;
const { restartProcess } = require("../functions/cb-process");
const { preloadAllPlayersCache } = require("../database/database");

module.exports = {
	name: Events.ClientReady,
	once: true,

	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setActivity("Clan Battle", { type: "PLAYING" });

		if (!database_uri) return;
		mongoose.connect(database_uri).then(() => {
			console.log("The client is now connected to the database");
			// Preload all players cache
			preloadAllPlayersCache();
			restartProcess(client);
		}).catch((err) => {
			console.log(err);
		});
	},
};