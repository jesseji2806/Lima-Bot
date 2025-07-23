const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require("discord.js");

module.exports = {
	AddRow: new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId("add-hit-1")
				.setLabel("Add 1 Hit")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId("add-hit-2")
				.setLabel("Add 2 Hits")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId("add-hit-all")
				.setLabel("Add All Hits")
				.setStyle(ButtonStyle.Primary),
		),
	RemoveRow: new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId("remove-hit-1")
				.setLabel("Remove 1 Hit")
				.setStyle(ButtonStyle.Danger),
			new ButtonBuilder()
				.setCustomId("remove-hit-2")
				.setLabel("Remove 2 Hits")
				.setStyle(ButtonStyle.Danger),
			new ButtonBuilder()
				.setCustomId("remove-hit-all")
				.setLabel("Remove All Hits")
				.setStyle(ButtonStyle.Danger),
		),

	createEmbed: function(cbId, cbDay, ...args) {
		if (cbDay === 0) {
			const date = args[0];
			console.log(date);
			const embed = new EmbedBuilder()
				.setColor("#0099ff")
				.setTitle(`CB ${cbId}`)
				.setDescription(`CB planned for <t:${date}:F> <t:${date}:R>.`);
			return embed;
		}
		else if (cbDay <= 5) {
			const date = args[0];

			const embed = new EmbedBuilder()
				.setColor("#0099ff")
				.setTitle(`CB ${cbId}`)
				.setDescription(`Hit registration for day ${cbDay} of CB${cbId}.\n
                                            Day ends at <t:${date}:F> <t:${date}:R>.`);
			return embed;
		}
		else {
			const embed = new EmbedBuilder()
				.setColor("#0099ff")
				.setTitle(`CB ${cbId}`)
				.setDescription("CB has ended.");
			return embed;
		}
	},
};