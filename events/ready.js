const mongoose = require("mongoose");
require("dotenv").config();
const Database = process.env.DATABASE;
const { restartProcess } = require("../functions/cb-process");

module.exports = {
	name: "ready",
	once: true,

	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setActivity("Clan Battle", { type: "PLAYING" });

		if (!Database) return;
		mongoose.connect(Database, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		}).then(() => {
			console.log("The client is now connected to the database")
			restartProcess(client);
		}).catch((err) => {
			console.log(err);
		});
	},
};