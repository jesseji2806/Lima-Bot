const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { Permissions } = require("discord.js");


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

	async execute(...args) {

		const interaction = args[0];
		const client = args[1];

		// Stop if not mod
		if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
			await interaction.reply({ content: "You do not have permission to modify clan.", ephemeral: true });
			return;
		}

		// Setting the player to update
		let playerToRemove = interaction.options.getUser("player-mention");
		if (!playerToRemove) {
			playerToRemove = interaction.options.getString("player");
			if (!playerToRemove) {
				await interaction.reply({ content: "You did not set a player!", ephemeral: true });
				return;
			}
		}
		else {
			playerToRemove = playerToRemove.id;
		}

		// Setting clan guildId
		const guildId = interaction.guildId;

		// Updating
		// const player = await clanSchema.findOne({ "clanId": guildId, $or: [ { "players.IGN": playerToRemove }, { "players.userId": playerToRemove } ] });
		const player = await clanSchema.aggregate([
			{
				$match: {
					$and: [
						{
							"clanId": guildId,
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
			await interaction.reply({ content: "Player is not in clan!", ephemeral: true });
			return;
		}
		const { IGN, userId, nbAcc } = player[0];
		const nbAccToRemove = -nbAcc;

		await clanSchema.updateOne({ "clanId": guildId }, { $inc: { "nbAcc": nbAccToRemove }, $pull: { "players": { "IGN": IGN, "userId": userId } } });
		await interaction.reply({ content: `Removed ${playerToRemove} from clan.` });
	},
};