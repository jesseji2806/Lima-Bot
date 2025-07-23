const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { clanSchema } = require("../../schemas/cb-clan");
const { getClanId } = require("../../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("clan-view")
		.setDescription("View players in the clan"),

	async execute(interaction) {

		const clanId = await getClanId(interaction);

		// Check clan
		const clanData = await clanSchema.findById(clanId);

		if (!clanData) {
			await interaction.reply({
				content: "Clan does not exist or is not accessible! Please create a clan first or try a different channel.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const { name, players, nbAcc } = clanData;

		// Updating
		let toReply = `Displaying ${nbAcc} players in ${name}:\n`;

		players.forEach(player => {
			if (player.nbAcc > 0) {
				toReply += `> ${player.IGN}\n`;
			}
		});

		await interaction.reply(toReply);
	},
};