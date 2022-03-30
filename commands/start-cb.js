const { SlashCommandBuilder } = require("@discordjs/builders");
const mongoose = require("mongoose");
const cbSchema = require("../schemas/cb-schema");
const { Permissions } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("start-cb")
		.setDescription("Start a CB instance")
        .addIntegerOption(option => 
            option.setName("int")
                .setDescription("Enter the CB number")
                .setRequired(true)),
    async execute(interaction) {

        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
            return;
        }

        const cbNumber = interaction.options.getInteger("int");
        if (cbNumber <= 0) {
            await interaction.reply({ content: "Invalid CB number.", ephemeral: true });
            return;
        }
        
        cbSchema.exists({cbId: cbNumber}, async function(err, clanBattle) {
            if (err) {
                await interaction.reply({ content: "An error has occured", ephemeral: true });
            } else if (clanBattle) {
                await interaction.reply({ content: "CB already exists!", ephemeral: true });
            } else {
                await new cbSchema({
                    cbId: cbNumber,
                    day: 1,
                    IGN: "Charby",
                    user: "deliberateEmbankment#6770",
                    first: false,
                    second: false,
                    third: false,
                }).save();
                await interaction.reply(`${interaction.user.tag} started a new clan battle, CB${cbNumber}!`);
            }
        });
    },
}