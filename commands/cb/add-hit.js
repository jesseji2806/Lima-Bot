const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require("discord.js");
const { getClanIdAndData, isPlayer, idToIGN, IGNToId, hitsToPrint, cbAddHit } = require("../../database/database");
const { AddHitReturnValues } = require("../../database/retval");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("add-hit")
		.setDescription("Add a hit to the CB Hit List")
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the player to add hit to"))
		.addUserOption(option =>
			option.setName("player-mention")
				.setDescription("Enter the player to add hit to using a mention"))
		.addIntegerOption(option =>
			option.setName("day")
				.setDescription("Enter the day of the hit")
				.addChoices(
					{ name: "1", value: 1 },
					{ name: "2", value: 2 },
					{ name: "3", value: 3 },
					{ name: "4", value: 4 },
					{ name: "5", value: 5 },
				))
		.addIntegerOption(option =>
			option.setName("hits")
				.setDescription("Enter the number of hits to add"))
		.addIntegerOption(option =>
			option.setName("boss")
				.setDescription("Enter the boss hit")
				.addChoices(
					{ name: "1", value: 1 },
					{ name: "2", value: 2 },
					{ name: "3", value: 3 },
					{ name: "4", value: 4 },
					{ name: "5", value: 5 },
				)),

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
		let playerHit = interaction.options.getString("player");
		const playerHitMention = interaction.options.getUser("player-mention");
		if (playerHitMention) {
			playerHit = playerHitMention.id;
		}

		if (!playerHit) {
			console.log("Setting command user as player to update.");
			playerHit = interaction.user.id;
		}

		// Convert to id if IGN
		if (interaction.options.getString("player")) {
			playerHit = await IGNToId(playerHit, clanId) || playerHit;
		}

		// Stop if the player is not valid
		if (await !isPlayer(playerHit, clanId)) {
			console.log("Player is not valid.");
			await interaction.reply({ content: "You have entered an invalid player name.", flags: MessageFlags.Ephemeral });
			return;
		}

		// Stop if trying to update someone else when not allowed
		if ((playerHit !== interaction.user.id) && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
			await interaction.reply({ content: "You do not have permission to add others' hits.", flags: MessageFlags.Ephemeral });
			return;
		}

		// Default to one hit if no hits specified
		const hitsToAdd = interaction.options.getInteger("hits") || 1;

		// Not active
		if (!clanData.cbActive) {
			await interaction.reply({ content: "CB hasn't started yet!", flags: MessageFlags.Ephemeral });
			return;
		}
		// Retrieve data for the CB by finding most recent CB
		if (clanData.CBs.length <= 0) {
			await interaction.reply({ content: "No CB data was found!", flags: MessageFlags.Ephemeral });
			return;
		}
		const cbData = clanData.CBs.reduce((p, c) => p.cbId > c.cbId ? p : c);

		// Setting hit day
		const hitDay = interaction.options.getInteger("day") || cbData.day;

		const retval = await cbAddHit(cbData, hitDay, playerHit, hitsToAdd);

		if (retval.status === AddHitReturnValues.ALREADY_COMPLETED) {
			await interaction.reply({ content: `Player has already hit all hits for day ${hitDay}.` });
			return;
		}
		else if (retval.status === AddHitReturnValues.INVALID_AMOUNT) {
			await interaction.reply({ content: "You are trying to add too many hits at once.", flags: MessageFlags.Ephemeral });
			return;
		}

		else if ("hitsDone" in retval) {
			// format hits for printing
			const printPlayer = await idToIGN(playerHit, clanId);
			const printHits = hitsToPrint(hitsToAdd);
			const printRet = hitsToPrint(retval.hitsDone);

			// send reply
			await interaction.reply({ content: `Added ${printHits} to ${printPlayer} on day ${hitDay}.\nPlayer has ${printRet} on day ${hitDay}.` });

			// logging
			await interaction.client.channels.cache.get(cbData.logs).send({ "content": `(CB${cbData.cbId}) ${interaction.user.tag} added ${printHits} to ${printPlayer} on day ${hitDay}. Total: ${printRet}` });

			// additional log message if all hits completed
			if (retval.status === AddHitReturnValues.COMPLETE) {
				await interaction.client.channels.cache.get(cbData.logs).send({ "content": `(CB${cbData.cbId}) ${printPlayer} has completed all ${printRet} on day ${hitDay}! Good work!` });
			}
			return;
		}
		else {
			await interaction.reply({ content: "An error has occured while adding hit." });
			return;
		}
	},
};