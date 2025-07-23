const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require("discord.js");
const { getClanIdAndData, idToIGN, IGNToId, hitsToPrint, cbRemoveHit, isPlayer } = require("../../database/database");
const { RemoveHitReturnValues } = require("../../database/retval");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("remove-hit")
		.setDescription("Remove a hit from the CB Hit List")
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the player to remove hit from"))
		.addUserOption(option =>
			option.setName("player-mention")
				.setDescription("Enter the player to remove hits from using a mention"))
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
				.setDescription("Enter the number of hits to remove")),

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
			await interaction.reply({ content: "You do not have permission to remove others' hits.", flags: MessageFlags.Ephemeral });
			return;
		}

		// Default to one hit if no hits specified
		let hitsToRemove = interaction.options.getInteger("hits");
		if (!hitsToRemove) {
			hitsToRemove = 1;
		}

		// Updating
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
		let hitDay = interaction.options.getInteger("day");
		if (!hitDay) {
			hitDay = cbData.day;
		}

		const retval = await cbRemoveHit(cbData, hitDay, playerHit, hitsToRemove);

		if (retval.status === RemoveHitReturnValues.NO_HITS) {
			await interaction.reply({ content: `Player has no hits on day ${hitDay}.` });
			return;
		}
		else if (retval.status === RemoveHitReturnValues.TOO_MANY_HITS) {
			await interaction.reply({ content: "You are trying to remove too many hits at once.", flags: MessageFlags.Ephemeral });
			return;
		}
		else if (retval.status === RemoveHitReturnValues.SUCCESS) {
			// format hits for printing
			const printPlayer = await idToIGN(playerHit, clanId);
			const printHits = hitsToPrint(hitsToRemove);
			const printRet = hitsToPrint(retval.hitsDone);

			// send reply
			await interaction.reply({ content: `Removed ${printHits} from ${printPlayer} on day ${hitDay}.\nPlayer has ${printRet} on day ${hitDay}.` });

			// logging
			await interaction.client.channels.cache.get(cbData.logs).send({ "content": `(CB${cbData.cbId}) ${interaction.user.tag} removed ${printHits} from ${printPlayer} on day ${hitDay}. Total: ${printRet}` });
			return;
		}
		else {
			await interaction.reply({ content: "An error has occured while removing hit." });
			return;
		}
	},
};