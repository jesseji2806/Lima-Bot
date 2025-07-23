const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require("discord.js");
const { clanSchema } = require("../../schemas/cb-clan");
const { getClanIdAndData, clearPlayersCache } = require("../../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("clan-remove")
		.setDescription("Remove a player from the clan")
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the IGN of the player to remove from the clan"))
		.addUserOption(option =>
			option.setName("player-mention")
				.setDescription("Mention the player to remove from the clan")),

	async execute(interaction) {

		// Stop if not mod
		if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
			await interaction.reply({ content: "You do not have permission to modify clan.", flags: MessageFlags.Ephemeral });
			return;
		}

		// Setting the player to update
		let playerToRemove = interaction.options.getUser("player-mention");
		if (!playerToRemove) {
			playerToRemove = interaction.options.getString("player");
			if (!playerToRemove) {
				await interaction.reply({ content: "You did not set a player!", flags: MessageFlags.Ephemeral });
				return;
			}
		}
		else {
			playerToRemove = playerToRemove.id;
		}

		// Setting clan guildId
		const { clanId, clanData } = await getClanIdAndData(interaction);
		if (!clanId || !clanData) {
			await interaction.reply({ content: "Clan does not exist or is not accessible! Please create a clan first or try a different channel.", flags: MessageFlags.Ephemeral });
			return;
		}

		if (clanData.cbActive) {
			await interaction.reply({ content: "You cannot remove players while a CB is active!", flags: MessageFlags.Ephemeral });
			return;
		}

		// Find player
		const player = await clanSchema.aggregate([
			{
				$match: {
					$and: [
						{
							"_id": clanId,
						},
						{
							$or: [
								{
									"players.IGN": playerToRemove,
								},
								{
									"players.userId": playerToRemove,
								},
							],
						},
					],
				},
			},
			{
				"$unwind": "$players",
			},
			{
				$match: {
					$or: [
						{
							"players.IGN": playerToRemove,
						},
						{
							"players.userId": playerToRemove,
						},
					],
				},
			},
			{
				"$replaceRoot": {
					"newRoot": "$players",
				},
			},
		]);

		// Check if player exists
		if (player.length <= 0) {
			await interaction.reply({ content: "Player is not in clan!", flags: MessageFlags.Ephemeral });
			return;
		}
		const { IGN, userId, nbAcc } = player[0];
		const nbAccToRemove = -nbAcc;

		await clanSchema.findByIdAndUpdate(
			clanId,
			{
				$inc: { "nbAcc": nbAccToRemove },
				$pull: {
					"players": {
						"IGN": IGN,
						"userId": userId,
					},
				},
			},
		);
		await interaction.reply({ content: `Removed ${playerToRemove} from clan.` });
		// Clear cache for this clan after removing a player
		await clearPlayersCache(clanId);
	},
};