const { Client, Interaction } = require("discord.js");
const { updateProcess } = require("../functions/cb-process");

module.exports = {
	name: "interactionCreate",
	/**
     * Execute slash command interactions
     * @param {Interaction} interaction
     * @param {Client} client
     */
	execute: async (interaction, client) => {
		if (!interaction.isCommand() && !interaction.isButton()) return;

		const command = client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			const guildId = interaction.guildId;
			await command.execute(interaction, client);
			await updateProcess(guildId);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
		}
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
	},
};