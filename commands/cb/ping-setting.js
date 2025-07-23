const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require("discord.js");
const { clanSchema } = require("../../schemas/cb-clan");
const { getClanIdAndData, isPlayer, IGNToId, idToIGN } = require("../../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping-setting")
		.setDescription("Changes ping setting for an user for current CB")
		.addStringOption(option =>
			option.setName("setting")
				.setDescription("Enter the setting to change to")
				.addChoices(
					{ name: "include", value: "include" },
					{ name: "exclude", value: "exclude" },
				)
				.setRequired(true))
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the player to change setting for"))
		.addUserOption(option =>
			option.setName("player-mention")
				.setDescription("Enter the player to change ping setting for using a mention")),

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
		let playerToUpdate = interaction.options.getString("player");
		const playerMention = interaction.options.getUser("player-mention");
		if (playerMention) {
			playerToUpdate = playerMention.id;
		}

		if (!playerToUpdate) {
			console.log("Setting command user as player to update.");
			playerToUpdate = interaction.user.id;
		}

		// Convert to id if IGN
		if (interaction.options.getString("player")) {
			playerToUpdate = await IGNToId(playerToUpdate, clanId) || playerToUpdate;
		}

		// Stop if the player is not valid
		if (await !isPlayer(playerToUpdate, clanId)) {
			console.log("Player is not valid.");
			await interaction.reply({ content: "You have entered an invalid player name.", flags: MessageFlags.Ephemeral });
			return;
		}

		// Stop if trying to update when not allowed
		if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
			await interaction.reply({ content: "You do not have permission to change ping settings", flags: MessageFlags.Ephemeral });
			return;
		}

		// Getting setting
		const pingOption = interaction.options.getString("setting");
		const pingSetting = pingOption === "exclude" ? false : true;

		// Updating
		if (clanData.CBs.length <= 0) {
			await interaction.reply({ content: "No CB data was found!", flags: MessageFlags.Ephemeral });
			return;
		}
		const cbData = clanData.CBs.reduce((p, c) => p.cbId > c.cbId ? p : c);

		// Use updateOne for more efficient and atomic update
		await clanSchema.updateOne(
			{
				"_id": clanId,
				"CBs._id": cbData._id,
				"CBs.hitList.userId": playerToUpdate,
			},
			{
				$set: { "CBs.$[cb].hitList.$[player].ping": pingSetting },
			},
			{
				arrayFilters: [
					{ "cb._id": cbData._id },
					{ "player.userId": playerToUpdate },
				],
			},
		);

		await interaction.reply({ "content": `Set ${await idToIGN(playerToUpdate, clanId)}'s ping settings to "${pingOption}".` });
	},
};