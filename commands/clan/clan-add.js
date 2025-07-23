const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require("discord.js");
const { clanSchema } = require("../../schemas/cb-clan");
const { getClanId, clearPlayersCache } = require("../../database/database");


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
				.setDescription("Enter the name of the clan to be created")),

	async execute(interaction) {

		// Stop if not mod
		if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
			await interaction.reply({ content: "You do not have permission to modify clan.", flags: MessageFlags.Ephemeral });
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
		const categoryId = interaction.channel.parentId;

		let clanId = await getClanId(interaction);

		const clanName = interaction.options.getString("clan-name");

		if (!clanId && !clanName) {
			await interaction.reply({ content: "Clan does not exist! Please create and add a clan name.", flags: MessageFlags.Ephemeral });
			return;
		}
		// If clanName is set, create a new clan only if no clan exists in current category
		else if (clanName) {
			const existingClan = await clanSchema.findOne({
				"guildId": guildId,
				"categoryId": categoryId,
			});
			if (!existingClan) {
				const newClan = await new clanSchema({
					"name": clanName,
					"clanId": guildId,
					"guildId": guildId,
					"categoryId": categoryId,
				}).save();

				clanId = newClan._id;
			}
		}

		const clanData = await clanSchema.findById(clanId);

		const { name, nbAcc } = clanData;

		// Updating
		// Clan max
		if (nbAcc + playerNbAcc > 30) {
			await interaction.reply({ content: "Too many accounts in clan! Please remove some first.", flags: MessageFlags.Ephemeral });
			return;
		}
		// Checking if player is already in clan
		const player = clanData.players.find(p => p.userId === newPlayerId);
		if (player !== undefined) {
			await interaction.reply({ content: "The player is already in the clan! If you want to add an account to the player, use /clan-edit.", flags: MessageFlags.Ephemeral });
			return;
		}
		// Adding to clan
		else {
			await clanSchema.findByIdAndUpdate(
				clanId,
				{
					$inc: { "nbAcc": playerNbAcc },
					$push: { "players": newPlayer },
				});
			await interaction.reply({ content: `Added ${newPlayerIGN} to ${name}.` });

			// Clear cache for this clan after adding a player
			await clearPlayersCache(clanId);
			return;
		}
	},
};