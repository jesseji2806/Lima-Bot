const { Client, Intents } = require("discord.js");

module.exports = {
	name: "interactionCreate",
	execute: async (interaction, client) => {
        if (!interaction.isCommand() && !interaction.isButton()) return;

        const command = client.commands.get(interaction.commandName);
    
        if (!command) return;
    
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
        }
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
	},
};