const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require("discord.js");
const { getClanIdAndData } = require("../../database/database");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping-unhit")
		.setDescription("Ping players who haven't hit today yet"),

	async execute(interaction) {

		// Setting clan guildId
		const { clanId, clanData } = await getClanIdAndData(interaction);
		if (!clanId || !clanData) {
			await interaction.reply({
				content: "Clan does not exist or is not accessible! Please create a clan first or try a different channel.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Stop if trying to update when not allowed
		if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
			await interaction.reply({ content: "You do not have permission to ping everyone", flags: MessageFlags.Ephemeral });
			return;
		}

		// Not active
		if (!clanData.cbActive) {
			await interaction.reply({ content: "CB not currently active!", flags: MessageFlags.Ephemeral });
			return;
		}
		// Retrieve data for the CB by finding most recent CB
		if (clanData.CBs.length <= 0) {
			await interaction.reply({ content: "No CB data was found!", flags: MessageFlags.Ephemeral });
			return;
		}
		const cbData = clanData.CBs.reduce((p, c) => p.cbId > c.cbId ? p : c);

		// Find all players with less than maximum hits
		const results = cbData.hitList.filter(cbPlayer => {
			const p = cbPlayer.hits[cbData.day - 1];
			return (p.hitsDone < (3 * cbPlayer.nbAcc)) && cbPlayer.ping;
		});

		let toReply = `Players who haven't done all hits on day ${cbData.day} for CB${cbData.cbId}:\n`;
		for (const post of results) {
			const user = post.userId;
			if (user) {
				toReply += `> <@${user}>\n`;
			}
		}
		toReply += "You haven't hit today yet!";
		await interaction.reply(toReply);
	},
};
