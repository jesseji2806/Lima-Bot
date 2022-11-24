const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { idToIGN } = require("../database/database");

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

	async execute(...args) {

		const interaction = args[0];
		const guildId = interaction.guildId;

		// Setting the player to update
		let playerToFind = interaction.options.getString("player");
		const playerToFindMention = interaction.options.getUser("player-mention");
		if (playerToFindMention) {
			playerToFind = playerToFindMention.id;
		}
		if (!playerToFind) {
			console.log("Setting command user as player to update.");
			playerToFind = idToIGN(interaction.user.id, guildId);
		}

		// Clan data
		const clanData = await clanSchema.findOne({ "clanId": guildId });
		if (!clanData) {
			await interaction.reply({ content: "No clan data was found!", ephemeral: true });
			return;
		}

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
			await interaction.reply({ content: "No CB data was found!", ephemeral: true });
			return;
		}

		cbToFind = cbData.cbId;
		const player = cbData.hitList.find(cbPlayer => {
			return cbPlayer.IGN === playerToFind || cbPlayer.userId === playerToFind;
		});

		// return if no player was found to match
		if (player === undefined) {
			console.log("Player is not valid.");
			await interaction.reply({ content: "You have entered an invalid player name.", ephemeral: true});
			return;
		}

		const maxHits = player.nbAcc * 3;

		// Create reply
		let toReply = `Results for ${playerToFind} for CB${cbToFind}\n`;
		for (let i = 0; i < 5; i++) {
			toReply += `**Day ${i + 1}** : ${player.hits[i].hitsDone} out of ${maxHits} hits complete.\n`;
		}
		await interaction.reply(toReply);
	},
};
