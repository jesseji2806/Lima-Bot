const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { Permissions } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("clan-edit")
		.setDescription("Edit a player to the clan")
		.addIntegerOption(option =>
			option.setName("nb-accounts")
				.setDescription("Enter the number of accounts the player has")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(30))
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the IGN of the player in the the clan"))
		.addUserOption(option =>
			option.setName("mention")
				.setDescription("Mention the player in to the clan")),

	async execute(...args) {

		const interaction = args[0];

		// Stop if not mod
		if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
			await interaction.reply({ content: "You do not have permission to modify clan.", ephemeral: true });
			return;
		}

		// Setting the player to update
		const playerNbAcc = interaction.options.getInteger("nb-accounts");

		const playerIGN = interaction.options.getString("player");
		let playerId = interaction.options.getUser("mention");
		if (playerId) {
			playerId = playerId.id;
		}

		if (!playerIGN && !playerId) {
			console.log("Setting command user as player to update.");
			playerId = interaction.user.id;
		}

		// Setting clan guildId
		const guildId = interaction.guildId;

		// Check clan
		const clanData = await clanSchema.findOne({ "clanId": guildId });

		if (!clanData) {
			await interaction.reply({ content: "Clan does not exist! Please create a clan first.", ephemeral: true });
			return;
		}

		const { nbAcc } = clanData;

		// Getting player data
		const player = clanData.players.find(p => p.userId === playerId || p.IGN === playerIGN);
		if (player === undefined) {
			await interaction.reply({ content: "The player is not in the clan! Add them first using /clan-add.", ephemeral: true });
			return;
		}

		// Updating
		// Clan max
		if (nbAcc + playerNbAcc - player.nbAcc > 30) {
			await interaction.reply({ content: "Too many accounts in clan! Please remove some first.", ephemeral: true });
			return;
		}
		// Updating
		else {
			clanData.nbAcc += playerNbAcc - player.nbAcc;
			player.nbAcc = playerNbAcc;
			await clanData.save();
			await interaction.reply({ content: `Changed ${player.IGN} to ${playerNbAcc} account(s).` });
			return;
		}
	},
};