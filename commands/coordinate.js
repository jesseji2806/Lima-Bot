const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { Permissions } = require("discord.js");
const { isPlayer, idToIGN, IGNToId } = require("../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("coordinate")
		.setDescription("Add a boss to the coordination list")
		.addIntegerOption(option =>
			option.setName("boss")
				.setDescription("Enter the boss you wish to hit")
				.setRequired(true)
				.addChoice("1", 1)
				.addChoice("2", 2)
				.addChoice("3", 3)
				.addChoice("4", 4)
				.addChoice("5", 5))
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the player to add hit coordination to"))
		.addUserOption(option =>
			option.setName("player-mention")
				.setDescription("Enter the player to add hit coordination to using a mention")),

	async execute(...args) {

		const interaction = args[0];
		const guildId = interaction.guildId;

		// Getting the boss to add to coordination
		const boss = interaction.options.getInteger("boss");

		// Setting the player to update
		let playerCoord = interaction.options.getString("player");
		// check by mention
		const playerHitMention = interaction.options.getUser("player-mention");
		if (playerHitMention) {
			playerCoord = playerHitMention.id;
		}

		if (!playerCoord) {
			console.log("Setting command user as player to update.");
			playerCoord = interaction.user.id;
		}

		// Convert to id if IGN
		if (IGNToId(playerCoord, guildId)) {
			playerCoord = IGNToId(playerCoord, guildId);
		}

		// Stop if the player is not valid
		if (!isPlayer(playerCoord, guildId)) {
			console.log("Player is not valid.");
			await interaction.reply({ content: "You have entered an invalid player name.", ephemeral: true});
			return;
		}

		// Stop if trying to update someone else when not allowed
		if ((playerCoord !== interaction.user.id) && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
			await interaction.reply({ content: "You do not have permission to change others' hit coordination.", ephemeral: true });
			return;
		}

		const clanData = await clanSchema.findOne({ "clanId": guildId });

		// Not active
		if (!clanData.cbActive) {
			await interaction.reply({ content: "CB hasn't started yet!", ephemeral: true });
			return;
		}
		// Retrieve data for the CB by finding most recent CB
		if (clanData.CBs.length <= 0) {
			await interaction.reply({ content: "No CB data was found!", ephemeral: true });
			return;
		}
		const cbData = clanData.CBs.reduce((p, c) => p.cbId > c.cbId ? p : c);

		// Updating
		const player = cbData.hitList.find(cbPlayer => cbPlayer.userId === playerCoord);

		if (player.hits[cbData.day - 1].coordinate[boss - 1]) {
			await interaction.reply({ content: `That boss is already in ${idToIGN(playerCoord, guildId)}'s coordination list.`, ephemeral: true });
			return;
		}
		else {
			player.hits[cbData.day - 1].coordinate[boss - 1] = true;
			await clanData.save();
			await interaction.reply({ content: `You have added boss ${boss} to ${idToIGN(playerCoord, guildId)}'s coordination list.` });
		}

		/** Outdated
		cbSchema.findOne({ IGN: "AquariumStatus" }, async function (err, data) {
			if (err) {
				console.log("Error obtaining current CB status.");
			} else {
				const coordCbId = data.cbId;
				const coordDate = data.day;

				if (coordDate === 0 || coordDate === 6) {
					await interaction.reply({ content: "CB hasn't started yet!", ephemeral: true });
					return;
				}
				const player = await cbSchema.findOneAndUpdate({ "cbId": coordCbId, "day": coordDate, "IGN": playerCoord, "bossIds": { $ne: boss } },
					{ $push: { "bossIds": boss } });

				if (!player) {
					await interaction.reply({ content: `That boss is already in ${playerCoord}'s coordination list.`, ephemeral: true });
					return;
				} else {
					await interaction.reply({ content: `You have added boss ${boss} to ${playerCoord}'s coordination list.` });
				}
			}
		});
        */
	},
};