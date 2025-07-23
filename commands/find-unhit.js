const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("find-unhit")
		.setDescription("Find players who haven't hit today yet"),

	async execute(...args) {

		const interaction = args[0];

		// Setting clan guildId
		const guildId = interaction.guildId;

		const clanData = await clanSchema.findOne({ "clanId": guildId });
		if (!clanData) {
			await interaction.reply({ content: "No clan data was found!", ephemeral: true });
			return;
		}

		// Not active
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

		// Find all players with less than maximum hits
		const results = cbData.hitList.filter(cbPlayer => {
			return cbPlayer.hits[cbData.day - 1].hitsDone < (3 * cbPlayer.nbAcc);
		});

		/** Outdated
		const results = await cbSchema.find(
			{ cbId: cbId, day: day,
				IGN: { $nin: [ "Aquarium", "AquariumStatus" ] },
				$expr: { $lt: [ "$hitsDone", { $multiply: [ "$nbAcc", 3 ] } ] } },
			null,
			{ sort: { "_id": 1 } });
        */

		let toReply = `Players who haven't done all hits on day ${cbData.day} for CB${cbData.cbId}:\n`;
		for (const post of results) {
			const name = post.IGN;
			toReply += `> ${name}\n`;
		}
		await interaction.reply(toReply);
	},
};
