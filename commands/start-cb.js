const { SlashCommandBuilder } = require("@discordjs/builders");
const mongoose = require("mongoose");
const cbSchema = require("../schemas/cb-schema");
const { Permissions } = require("discord.js");
const { idToIGN, createCB, cbAddHit } = require("../database/database");
const { createEmbed, row } = require("../functions/cb-button");
const { startProcess } = require("../functions/cb-process");
const moment = require("moment");



module.exports = {
	data: new SlashCommandBuilder()
		.setName("start-cb")
		.setDescription("Start a CB instance")
        .addIntegerOption(option => 
            option.setName("cb-id")
                .setDescription("Enter the CB number")
                .setRequired(true))
        .addChannelOption(option =>
            option.setName("destination")
                .setDescription("Enter destination")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("start-date")
                .setDescription("Enter the planned start date (DD-MM-YYYY)")
                .setRequired(true)),
                
    async execute(...args) {

        const interaction = args[0];
        const client = args[1];

        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
            return;
        }

        const cbNumber = interaction.options.getInteger("cb-id");
        if (cbNumber <= 0) {
            await interaction.reply({ content: "Invalid CB number.", ephemeral: true });
            return;
        }
        const dateParsed = moment(interaction.options.getString("start-date"), "DD-MM-YYYY");
        if (!dateParsed.isValid()) {
            await interaction.reply({ content: "Invalid date. Format is DD-MM-YYYY", ephemeral: true });
            return;
        }

        
        cbSchema.exists({cbId: cbNumber}, async function(err, clanBattle) {
            if (err) {
                await interaction.reply({ content: "An error has occured", ephemeral: true });
            } else if (clanBattle) {
                await interaction.reply({ content: "CB already exists!", ephemeral: true });
            } else {
                const isActive = cbSchema.exists({ IGN: "AquariumStatus", cbDay: { $lte: 5 } });
                console.log(isActive);

                if (isActive != null) {
                    await interaction.reply({ content: "CB currently active!", ephemeral: true });
                } else {
                    // creates the documents for the clan battle
                    createCB(cbNumber);
                    console.log("Created CB");
                    await interaction.reply(`${interaction.user.tag} started a new clan battle, CB${cbNumber}!`);

                    dateParsed.utc().hour(13);
                    startProcess(interaction, cbNumber, dateParsed, client);
                }
            }
        });
    },
}