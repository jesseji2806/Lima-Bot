const { SlashCommandBuilder } = require("@discordjs/builders");
const cbSchema = require("../schemas/cb-schema");
const { Permissions } = require("discord.js");
const { isPlayer, idToIGN } = require("../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping-setting")
		.setDescription("Changes ping setting for an user for current CB")
        .addStringOption(option =>
            option.setName("setting")
                .setDescription("Enter the setting to change to")
                .addChoice("include", "include")
                .addChoice("exclude", "exclude")
                .setRequired(true))
        .addStringOption(option => 
            option.setName("player")
                .setDescription("Enter the player to change setting for"))
        .addUserOption(option => 
            option.setName("player-mention")
                .setDescription("Enter the player to change ping setting for using a mention")),

	async execute(...args) {

        const interaction = args[0];

        // Setting the player to update
        let playerToUpdate = interaction.options.getString("player");
        const playerMention = interaction.options.getUser("player-mention");
        if (playerMention) {
            playerToUpdate = playerMention.id;
        }

        if (!playerToUpdate) {
            console.log("Setting command user as player to update.");
            playerToUpdate = idToIGN(interaction.user.id);
        }

        // Convert to IGN if id
        if (idToIGN(playerToUpdate)) {
            playerToUpdate = idToIGN(playerToUpdate)
        }
        
        // Stop if the player is not valid
        if (!isPlayer(playerToUpdate)) {
            console.log("Player is not valid.");
            await interaction.reply({ content: "You have entered an invalid player name.", ephemeral: true});
            return;
        }

        // Stop if trying to update when not allowed
        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to change ping settings", ephemeral: true });
            return;
        }

        // Getting setting
        let pingSetting = true;
        const pingOption = interaction.options.getString("setting")
        if (pingOption === "exclude") {
            pingSetting = false;
        } else {
            pingSetting = true;
        }

         // Updating
         cbSchema.findOne({ "IGN": "AquariumStatus" }, async function (err, data) {
            if (err) {
                console.log("Error obtaining current CB status.");
            } else {
                await cbSchema.updateMany({ "IGN": playerToUpdate, "cbId": data.cbId }, { $set: { "ping": pingSetting } });
                await interaction.reply({ "content": `Set ${playerToUpdate}'s ping settings to "${pingOption}".`});
            }
        });
    }
}