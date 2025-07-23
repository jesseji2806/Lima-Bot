const { SlashCommandBuilder, MessageFlags, PermissionsBitField, ChannelType } = require("discord.js");
const { getClanIdAndData, getNbClans, createCB } = require("../../database/database");
const { startProcess } = require("../../functions/cb-process");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const { get } = require("mongoose");
dayjs.extend(utc);
dayjs.extend(customParseFormat);


module.exports = {
	data: new SlashCommandBuilder()
		.setName("start-cb")
		.setDescription("Start a CB instance")
		.addIntegerOption(option =>
			option.setName("cb-id")
				.setDescription("Enter the CB number")
				.setRequired(true))
		.addChannelOption(option =>
			option.setName("destination")
				.setDescription("Enter destination channel")
				.setRequired(true))
		.addChannelOption(option =>
			option.setName("logs")
				.setDescription("Enter logs channel")
				.setRequired(true))
		.addStringOption(option =>
			option.setName("start-date")
				.setDescription("Enter the planned start date (DD-MM-YYYY)")
				.setRequired(true)),

	async execute(interaction) {

		const { clanId, clanData } = await getClanIdAndData(interaction);
		if (!clanId || !clanData) {
			await interaction.reply({
				content: "Clan does not exist or is not accessible! Please create a clan first or try a different channel.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// checking for permissions
		if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
			await interaction.reply({ content: "You do not have permission to use this command.", flags: MessageFlags.Ephemeral });
			return;
		}

		// checking positive cb-id
		const cbId = interaction.options.getInteger("cb-id");
		if (cbId <= 0) {
			await interaction.reply({ content: "Invalid CB number.", flags: MessageFlags.Ephemeral });
			return;
		}

		// checking date format
		const dateString = interaction.options.getString("start-date");
		const dateParsed = dayjs(dateString, "DD-MM-YYYY", true);
		if (!dateParsed.isValid()) {
			await interaction.reply({ content: "Invalid date. Format is DD-MM-YYYY", flags: MessageFlags.Ephemeral });
			return;
		}

		// checking destination and logs channel
		const destinationChannel = interaction.options.getChannel("destination");
		const logsChannel = interaction.options.getChannel("logs");
		if (destinationChannel.type !== ChannelType.GuildText || logsChannel.type !== ChannelType.GuildText) {
			await interaction.reply({
				content: "Destination and logs channels must be text channels.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		if (await getNbClans(interaction.guild.id) > 1) {
			// ensure the destination channel is within the same clan
			if (destinationChannel.parentId !== clanData.categoryId) {
				await interaction.reply({ content: "Destination channel must be in the same category as the clan.", flags: MessageFlags.Ephemeral });
				return;
			}
			if (logsChannel.parentId !== clanData.categoryId) {
				await interaction.reply({ content: "Logs channel must be in the same category as the clan.", flags: MessageFlags.Ephemeral });
				return;
			}
		}

		// boss ids - deprecated
		const bossIds = [];

		// getting log channel id
		const logs = interaction.options.getChannel("logs").id;

		// Check if a CB is currently active
		// Check if existing CB
		const cbExists = clanData.CBs.find(cb => cb.cbId === cbId) !== undefined;

		if (cbExists || clanData.cbActive) {
			await interaction.reply({ content: "Either CB already exists or a CB is currently active!", flags: MessageFlags.Ephemeral });
			return;
		}
		else {
			// creates the documents for the clan battle
			await createCB(clanId, cbId, bossIds, logs);
			console.log(`Created CB in clan ${clanData.name} with id ${clanId}`);
			await interaction.reply(`${interaction.user.tag} started a new clan battle, CB${cbId}!`);

			dateParsed.utc().hour(20);
			startProcess(interaction, cbId, dateParsed);
		}
	},
};