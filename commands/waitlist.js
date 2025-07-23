const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("waitlist")
		.setDescription("Retrieve the waitlist"),

	async execute(...args) {

		const interaction = args[0];
		const guildId = interaction.guildId;

		const clanData = await clanSchema.findOne({ "clanId": guildId });
		if (!clanData) {
			await interaction.reply({ content: "No clan data was found!", ephemeral: true });
			return;
		}

		if (!clanData.cbActive) {
			await interaction.reply({ content: "CB not currently active!", ephemeral: true });
			return;
		}

		// Retrieve data for the CB by finding most recent CB
		if (clanData.CBs.length <= 0) {
			await interaction.reply({ content: "No CB data was found!", ephemeral: true });
			return;
		}
		const cbData = clanData.CBs.reduce((p, c) => p.cbId > c.cbId ? p : c);

		let toReply = `Waitlist for day ${cbData.day} of CB${cbData.cbId}:\n`;

		for (let i = 0; i < 5; ++i) {
			const players = cbData.hitList.filter(cbPlayer => {
				return cbPlayer.hits[cbData.day - 1].coordinate[i] === true;
			});

			if (players.length > 0) {
				toReply += `**Boss ${i + 1}:**\n`;
				for (const player of players) {
					toReply += `> ${player.IGN}\n`;
				}
			}
		}

		await interaction.reply(toReply);
	},
}
