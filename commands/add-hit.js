const { SlashCommandBuilder } = require("@discordjs/builders");
const mongoose = require("mongoose");
const cbSchema = require("../schemas/cb-schema");
const { Permissions } = require("discord.js");
const { idToIGN, IGNToId, cbAddHit } = require("../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("add-hit")
		.setDescription("Add a hit to the CB Hit List")
        .addStringOption(option => 
            option.setName("player")
                .setDescription("Enter the player to add hit to"))
        .addIntegerOption(option =>
            option.setName("day")
                .setDescription("Enter the day of the hit")
                .addChoice("1", 1)
                .addChoice("2", 2)
                .addChoice("3", 3)
                .addChoice("4", 4)
                .addChoice("5", 5)),

	async execute(...args) {

        const interaction = args[0];

        // Setting the player to update
        let playerHit = interaction.options.getString("player");
        if (!playerHit) {
            console.log("Setting command user as player to update.");
            playerHit = idToIGN(interaction.user.id);
        }
        
        // Stop if the player is not valid
        if ((!IGNToId(playerHit)) && !idToIGN(playerHit)) {
            console.log("Player is not valid.");
            await interaction.reply({ content: "You have entered an invalid player name.", ephemeral: true});
            return;
        }

        // Stop if trying to update someone else when not allowed
        if ((IGNToId(playerHit) !== interaction.user.id) && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to add others' hits.", ephemeral: true });
            return;
        }

        // Updating
        cbSchema.findOne({ IGN: "AquariumStatus" }, async function (err, data) {
            if (err) {
                console.log("Error obtaining current CB status.");
            } else {
                const hitCbId = data.cbId;
                let hitDay = interaction.options.getInteger("day");
                if (!hitDay) {
                    hitDay = data.day;
                }
                if (hitDay === 0) {
                    await interaction.reply({ content: "CB hasn't started yet!" });
                    return;
                }

                cbAddHit(hitCbId, hitDay, playerHit, async function(retval) {
                    if (retval === "Added hit") {
                        await interaction.reply({ content: `Added hit to ${playerHit} on day ${hitDay}.`});
                        return;
                    } else if (retval === "All hits done") {
                        await interaction.reply({ content: `You have already hit all hits for day ${hitDay}.`});
                        return;
                    } else {
                        await interaction.reply({ content: "An error has occured while adding hit."});
                        return;
                    }
                });
                return;
            }
        });
	},
};