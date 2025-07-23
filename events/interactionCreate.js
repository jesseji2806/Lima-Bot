const { Events, MessageFlags } = require("discord.js");
const { getClanId } = require("../database/database");
const { updateProcess } = require("../functions/cb-process");

module.exports = {
	name: Events.InteractionCreate,
	execute: async (interaction) => {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			const clanId = await getClanId(interaction);
			await command.execute(interaction);
			await updateProcess(clanId);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({ content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral });
		}
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
	},
};