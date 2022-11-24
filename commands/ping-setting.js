const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { Permissions } = require("discord.js");
const { isPlayer, idToIGN } = require("../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping-setting")
		.setDescription("Changes ping setting for an user for current CB")
		.addStringOption(option =>
			option.setName("setting")
				.setDescription("Enter the setting to change to")
				.addChoice("include", "include")
				.addChoice("exclude", "exclude")
				.setRequired(true))
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the player to change setting for"))
		.addUserOption(option =>
			option.setName("player-mention")
				.setDescription("Enter the player to change ping setting for using a mention")),

	async execute(...args) {

		const interaction = args[0];
		const guildId = interaction.guildId;

		// Setting the player to update
		let playerToUpdate = interaction.options.getString("player");
		const playerMention = interaction.options.getUser("player-mention");
		if (playerMention) {
			playerToUpdate = playerMention.id;
		}

		if (!playerToUpdate) {
			console.log("Setting command user as player to update.");
			playerToUpdate = idToIGN(interaction.user.id, guildId);
		}

		// Convert to IGN if id
		if (idToIGN(playerToUpdate, guildId)) {
			playerToUpdate = idToIGN(playerToUpdate, guildId);
		}

		// Stop if the player is not valid
		if (!isPlayer(playerToUpdate, guildId)) {
			console.log("Player is not valid.");
			await interaction.reply({ content: "You have entered an invalid player name.", ephemeral: true});
			return;
		}

		// Stop if trying to update when not allowed
		if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
			await interaction.reply({ content: "You do not have permission to change ping settings", ephemeral: true });
			return;
		}

		// Getting setting
		let pingSetting = true;
		const pingOption = interaction.options.getString("setting")
		if (pingOption === "exclude") {
			pingSetting = false;
		} else {
			pingSetting = true;
		}

		// Updating
		const clanData = await clanSchema.findOne({ "clanId": guildId });
		if (!clanData) {
			await interaction.reply({ content: "No clan data was found!", ephemeral: true });
			return;
		}

		if (clanData.CBs.length <= 0) {
			await interaction.reply({ content: "No CB data was found!", ephemeral: true });
			return;
		}
        const cbData = clanData.CBs.reduce((p, c) => p.cbId > c.cbId ? p : c);

		const player = cbData.hitList.find(cbPlayer => cbPlayer.IGN === playerToUpdate);

		player.ping = pingSetting;

		await clanData.save();
		await interaction.reply({ "content": `Set ${playerToUpdate}'s ping settings to "${pingOption}".`});
	}
}