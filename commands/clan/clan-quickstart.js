const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require("discord.js");
const { clanSchema } = require("../../schemas/cb-clan");
const { getClanId, clearPlayersCache } = require("../../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("clan-quickstart")
		.setDescription("Quickly add all players with a role to the clan")
		.addRoleOption(option =>
			option.setName("role")
				.setDescription("Enter the role of the players to add to the clan")
				.setRequired(true))
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
		const role = interaction.options.getRole("role");
		if (!role) {
			await interaction.reply({
				content: "Role not found! Please enter a valid role name.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Populate member cache
		await interaction.guild.members.fetch();

		// Get all members with the specified role
		const membersWithRole = role.members;
		console.log("Members with role:", membersWithRole.size);
		if (membersWithRole.size === 0) {
			await interaction.reply({
				content: "No members found with the specified role.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

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
		if (nbAcc + membersWithRole.size > 30) {
			await interaction.reply({ content: "Too many accounts in clan! Please remove some first.", flags: MessageFlags.Ephemeral });
			return;
		}


		// Adding each member to the clan
		let replyMessage = `Quickstart adding players to clan: ${name}\n`;
		let addedCount = 0;

		for (const member of membersWithRole.values()) {
			// Create document for the new player
			const newPlayer = {
				"IGN": member.user.displayName,
				"userId": member.id,
				"nbAcc": 1,
			};
			// Checking if player is already in clan
			const player = clanData.players.find(p => p.userId === newPlayer.userId);
			if (player !== undefined) {
				replyMessage += `${newPlayer.IGN} is already in the clan! Skipped\n`;
				continue;
			}
			// Adding to clan
			else {
				clanData.nbAcc += newPlayer.nbAcc;
				clanData.players.push(newPlayer);
				replyMessage += `Added ${newPlayer.IGN}.\n`;
				addedCount++;
			}
		}

		// Save all changes at once
		if (addedCount > 0) {
			await clanData.save();
			// Clear cache for this clan after adding players
			clearPlayersCache(clanId);
			await interaction.reply({ content: replyMessage });
		}
		else {
			await interaction.reply({ content: replyMessage + "No players were added to the clan." });
		}
	},
};