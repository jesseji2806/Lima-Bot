const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { Permissions } = require("discord.js");
const { createCB } = require("../database/database");
const { startProcess } = require("../functions/cb-process");
const moment = require("moment");


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
		.addChannelOption(option =>
			option.setName("coordination")
				.setDescription("Enter coordination channel")
				.setRequired(true))
		.addStringOption(option =>
			option.setName("start-date")
				.setDescription("Enter the planned start date (DD-MM-YYYY)")
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName("boss-1")
				.setDescription("Enter the image ID for boss 1")
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName("boss-2")
				.setDescription("Enter the image ID for boss 1")
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName("boss-3")
				.setDescription("Enter the image ID for boss 1")
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName("boss-4")
				.setDescription("Enter the image ID for boss 1")
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName("boss-5")
				.setDescription("Enter the image ID for boss 1")
				.setRequired(true)),

	async execute(...args) {

		const interaction = args[0];
		const client = args[1];
		const clanId = interaction.guildId;

		// checking for permissions
		if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
			await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
			return;
		}

		// checking positive cb-id
		const cbId = interaction.options.getInteger("cb-id");
		if (cbId <= 0) {
			await interaction.reply({ content: "Invalid CB number.", ephemeral: true });
			return;
		}

		// checking date format
		const dateParsed = moment(interaction.options.getString("start-date"), "DD-MM-YYYY");
		if (!dateParsed.isValid()) {
			await interaction.reply({ content: "Invalid date. Format is DD-MM-YYYY", ephemeral: true });
			return;
		}

		// creating array from boss ids
		const bossIds = [];
		for (let i = 0; i < 5; ++i) {
			bossIds[i] = interaction.options.getInteger("boss-" + (i + 1));
		}

		// getting log channel id
		const logs = interaction.options.getChannel("logs").id;

		// Check if a CB is currently active
		const { cbActive, CBs } = await clanSchema.findOne({ "clanId": clanId });

		// Check if existing CB
		const cbExists = CBs.find(cb => cb.cbId === cbId) === undefined;

		if (cbExists || cbActive) {
			await interaction.reply({ content: "Either CB already exists or a CB is currently active!", ephemeral: true });
			return;
		}
		else {
			// creates the documents for the clan battle
			createCB(clanId, cbId, bossIds, logs);
			console.log(`Created CB in server ${clanId}`);
			await interaction.reply(`${interaction.user.tag} started a new clan battle, CB${cbId}!`);

			dateParsed.utc().hour(13);
			startProcess(interaction, cbId, dateParsed, client);
		}
	},
};