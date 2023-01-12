const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("clan-view")
		.setDescription("View players in the clan"),

	async execute(...args) {

		const interaction = args[0];
		const guildId = interaction.guildId;

		// Check clan
		const clanData = await clanSchema.findOne({ "clanId": guildId });

		if (!clanData) {
			await interaction.reply({ content: "Clan does not exist! Please create a clan.", ephemeral: true });
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