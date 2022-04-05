const { SlashCommandBuilder } = require("@discordjs/builders");
const mongoose = require("mongoose");
const cbSchema = require("../schemas/cb-schema");
const { idToIGN, IGNToId, cbAddHit } = require("../database/database");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("get-hit")
		.setDescription("Find number of hits done to a CB")
        .addStringOption(option => 
            option.setName("player")
                .setDescription("Enter the player to find hits of"))
        .addIntegerOption(option =>
            option.setName("cb-id")
                .setDescription("Enter the CB you want to look up")),

	async execute(...args) {

        const interaction = args[0];

        // Setting the player to update
        let playerToFind = interaction.options.getString("player");
        if (!playerToFind) {
            console.log("Setting command user as player to update.");
            playerToFind = idToIGN(interaction.user.id);
        }
        
        // Stop if the player is not valid
        if ((!IGNToId(playerToFind)) && !idToIGN(playerToFind)) {
            console.log("Player is not valid.");
            await interaction.reply({ content: "You have entered an invalid player name.", ephemeral: true});
            return;
        }
        let cbToFind = interaction.options.getInteger("cb-id");

        if (!cbToFind) {
            const status = await cbSchema.findOne({ IGN: "AquariumStatus" });
            cbToFind = status.cbId;
        }

        const results = await cbSchema.find({ cbId: cbToFind, IGN: playerToFind }).sort({ day: "asc" });

        let toReply = `Results for ${playerToFind} for CB${cbToFind}\n`;
        for (const post of results) {
            const hitDay = post.day;
            const dayResults = post.hitsDone;
            toReply += `Day ${hitDay} : ${dayResults} out of 3 hits complete.\n`;
        }
        await interaction.reply(toReply);
    },
}
