const { SlashCommandBuilder } = require("@discordjs/builders");
const cbSchema = require("../schemas/cb-schema");
const { Permissions } = require("discord.js");
const { createCB } = require("../database/database");
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
                .setDescription("Enter destination channel")
                .setRequired(true))
        .addChannelOption(option =>
            option.setName("logs")
                .setDescription("Enter logs channel")
                .setRequired(true))
        .addChannelOption(option =>
            option.setName("coordination")
                .setDescription("Enter coordination channel")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("start-date")
                .setDescription("Enter the planned start date (DD-MM-YYYY)")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("boss-1")
                .setDescription("Enter the image ID for boss 1")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("boss-2")
                .setDescription("Enter the image ID for boss 1")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("boss-3")
                .setDescription("Enter the image ID for boss 1")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("boss-4")
                .setDescription("Enter the image ID for boss 1")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("boss-5")
                .setDescription("Enter the image ID for boss 1")
                .setRequired(true)),
                
    async execute(...args) {

        const interaction = args[0];
        const client = args[1];

        // checking for permissions
        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
            return;
        }

        // checking positive cb-id
        const cbNumber = interaction.options.getInteger("cb-id");
        if (cbNumber <= 0) {
            await interaction.reply({ content: "Invalid CB number.", ephemeral: true });
            return;
        }

        // checking date format
        const dateParsed = moment(interaction.options.getString("start-date"), "DD-MM-YYYY");
        if (!dateParsed.isValid()) {
            await interaction.reply({ content: "Invalid date. Format is DD-MM-YYYY", ephemeral: true });
            return;
        }

        // creating array from boss ids
        const bossIds = [];
        for (let i = 0; i < 5; ++i) {
            bossIds[i] = interaction.options.getInteger("boss-" + (i + 1));
        }
        
        // getting log channel id
        const logs = interaction.options.getChannel("logs").id;

        cbSchema.exists({cbId: cbNumber}, async function(err, clanBattle) {
            if (err) {
                await interaction.reply({ content: "An error has occured", ephemeral: true });
            } else if (clanBattle) {
                await interaction.reply({ content: "CB already exists!", ephemeral: true });
            } else {
                cbSchema.exists({ IGN: "AquariumStatus", day: { $lte: 5 } }, async function(err, status) {
                    if (status) {
                        await interaction.reply({ content: "CB currently active!", ephemeral: true });
                    } else {
                        // creates the documents for the clan battle
                        createCB(interaction.guildId, cbNumber, bossIds, logs);
                        console.log("Created CB");
                        await interaction.reply(`${interaction.user.tag} started a new clan battle, CB${cbNumber}!`);

                        dateParsed.utc().hour(13);
                        startProcess(interaction, cbNumber, dateParsed, client);
                    }
                });
            }
        });
    },
}