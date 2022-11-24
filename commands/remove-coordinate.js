const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { Permissions } = require("discord.js");
const { isPlayer, idToIGN, IGNToId } = require("../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("remove-coordinate")
		.setDescription("Remove a boss from the coordination list")
		.addIntegerOption(option =>
			option.setName("boss")
				.setDescription("Enter the boss you wish to remove")
				.setRequired(true)
				.addChoice("1", 1)
				.addChoice("2", 2)
				.addChoice("3", 3)
				.addChoice("4", 4)
				.addChoice("5", 5))
		.addStringOption(option =>
			option.setName("player")
				.setDescription("Enter the player to remove hit coordination from"))
		.addUserOption(option =>
			option.setName("player-mention")
				.setDescription("Enter the player to remove hit coordination from using a mention")),

	async execute(...args) {

		const interaction = args[0];
		const guildId = interaction.guildId;

		// Getting the boss to add to coordination
		const boss = interaction.options.getInteger("boss");

		// Setting the player to update
		let playerCoord = interaction.options.getString("player");
		const playerHitMention = interaction.options.getUser("player-mention");
		if (playerHitMention) {
			playerCoord = playerHitMention.id;
		}

		if (!playerCoord) {
			console.log("Setting command user as player to update.");
			playerCoord = idToIGN(interaction.user.id, guildId);
		}

		// Convert to IGN if id
		if (idToIGN(playerCoord, guildId)) {
			playerCoord = idToIGN(playerCoord, guildId);
		}

		// Stop if the player is not valid
		if (!isPlayer(playerCoord, guildId)) {
			console.log("Player is not valid.");
			await interaction.reply({ content: "You have entered an invalid player name.", ephemeral: true});
			return;
		}

		// Stop if trying to update someone else when not allowed
		if ((IGNToId(playerCoord, guildId) !== interaction.user.id) && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
			await interaction.reply({ content: "You do not have permission to change others' hit coordination.", ephemeral: true });
			return;
		}

		// Updating
		const clanData = await clanSchema.findOne({ "clanId": guildId });
		if (!clanData) {
			await interaction.reply({ content: "No clan data was found!", ephemeral: true });
			return;
		}

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
		const player = cbData.hitList.find(cbPlayer => cbPlayer.IGN === playerCoord);

		if (!player.hits[cbData.day - 1].coordinate[boss - 1]) {
			await interaction.reply({ content: `That boss is not in ${playerCoord}'s coordination list.`, ephemeral: true });
			return;
		}
		else {
			player.hits[cbData.day - 1].coordinate[boss - 1] = false;
			await clanData.save();
			await interaction.reply({ content: `You have removed boss ${boss} from ${playerCoord}'s coordination list.` });
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
				const player = await cbSchema.findOneAndUpdate({ "cbId": coordCbId, "day": coordDate, "IGN": playerCoord, "bossIds": boss },
					{ $pull: { "bossIds": boss } });

				if (!player) {
					await interaction.reply({ content: `That boss is not in ${playerCoord}'s coordination list.`, ephemeral: true });
					return;
				} else {
					await interaction.reply({ content: `You have removed boss ${boss} from ${playerCoord}'s coordination list.` });
				}
			}
		});
        */
	},
};