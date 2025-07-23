const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getClanIdAndData, idToIGN, IGNToId } = require("../../database/database");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("get-hit")
		.setDescription("Find number of hits done to a CB")
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the player to find hits of"))
		.addUserOption(option =>
			option.setName("player-mention")
				.setDescription("Enter the player to find hits of using a mention"))
		.addIntegerOption(option =>
			option.setName("cb-id")
				.setDescription("Enter the CB you want to look up")),

	async execute(interaction) {

		const { clanId, clanData } = await getClanIdAndData(interaction);
		if (!clanId || !clanData) {
			await interaction.reply({
				content: "Clan does not exist or is not accessible! Please create a clan first or try a different channel.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Setting the player to update
		let playerToFind = interaction.options.getString("player");
		const playerToFindMention = interaction.options.getUser("player-mention");
		if (playerToFindMention) {
			playerToFind = playerToFindMention.id;
		}
		else if (playerToFind) {
			playerToFind = await IGNToId(playerToFind, clanId) || playerToFind;
		}
		if (!playerToFind) {
			console.log("Setting command user as player to update.");
			playerToFind = interaction.user.id;
		}

		// Default to find latest CB
		let cbToFind = interaction.options.getInteger("cb-id");

		let cbData;
		if (!cbToFind) {
			cbData = clanData.CBs.reduce((p, c) => p.cbId > c.cbId ? p : c);
		}
		else {
			cbData = clanData.CBs.find(cb => cb.cbId === cbToFind);
		}

		// return if no CB was found
		if (cbData === undefined) {
			await interaction.reply({ content: "No CB data was found!", flags: MessageFlags.Ephemeral });
			return;
		}

		cbToFind = cbData.cbId;
		const player = cbData.hitList.find(cbPlayer => {
			return cbPlayer.IGN === playerToFind || cbPlayer.userId === playerToFind;
		});

		// return if no player was found to match
		if (player === undefined) {
			console.log("Player is not valid.");
			await interaction.reply({ content: "You have entered an invalid player name.", flags: MessageFlags.Ephemeral });
			return;
		}

		const maxHits = player.nbAcc * 3;

		// Create reply
		let toReply = `Results for ${await idToIGN(playerToFind, clanId) || playerToFind} for CB${cbToFind}\n`;
		for (let i = 0; i < 5; i++) {
			toReply += `**Day ${i + 1}** : ${player.hits[i].hitsDone} out of ${maxHits} hits complete.\n`;
		}
		await interaction.reply(toReply);
	},
};
