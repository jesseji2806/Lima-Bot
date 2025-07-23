const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { Permissions } = require("discord.js");
const { updatePlayers } = require("../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("clan-add")
		.setDescription("Add a player to the clan")
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the IGN of the player to add to the clan")
				.setRequired(true))
		.addUserOption(option =>
			option.setName("mention")
				.setDescription("Mention the player to add to the clan")
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName("nb-accounts")
				.setDescription("Enter the number of accounts the player has")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(30))
		.addStringOption(option =>
			option.setName("clan-name")
				.setDescription("Enter the name of the clan")),

	async execute(...args) {

		const interaction = args[0];

		// Stop if not mod
		if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
			await interaction.reply({ content: "You do not have permission to modify clan.", ephemeral: true });
			return;
		}

		// Setting the player to update
		const playerNbAcc = interaction.options.getInteger("nb-accounts");
		const newPlayerIGN = interaction.options.getString("player");
		const newPlayerId = interaction.options.getUser("mention").id;

		// Create document for the new player
		const newPlayer = {
			"IGN": newPlayerIGN,
			"userId": newPlayerId,
			"nbAcc": playerNbAcc,
		};

		// Setting clan guildId
		const guildId = interaction.guildId;

		// Check clan
		let clanData = await clanSchema.findOne({ "clanId": guildId });

		const clanName = interaction.options.getString("clan-name");

		if (!clanData && !clanName) {
			await interaction.reply({ content: "Clan does not exist! Please create and add a clan name.", ephemeral: true });
			return;
		}
		else if (!clanData) {
			await new clanSchema({
				"name": clanName,
				"clanId": guildId,
			}).save();

			clanData = await clanSchema.findOne({ "clanId": guildId });
		}

		const { name, nbAcc } = clanData;

		// Updating
		// Clan max
		if (nbAcc + playerNbAcc > 30) {
			await interaction.reply({ content: "Too many accounts in clan! Please remove some first.", ephemeral: true });
			return;
		}
		// Checking if player is already in clan
		const player = clanData.players.find(p => p.userId === newPlayerId);
		if (player !== undefined) {
			await interaction.reply({ content: "The player is already in the clan! If you want to add an account to the player, use /clan-edit.", ephemeral: true });
			return;
		}
		// Adding to clan
		else {
			await clanSchema.updateOne({ "clanId": guildId }, { $inc: { "nbAcc": playerNbAcc }, $push: { "players": newPlayer } });
			await updatePlayers(guildId);
			await interaction.reply({ content: `Added ${newPlayerIGN} to ${name}.` });
			return;
		}
	},
};