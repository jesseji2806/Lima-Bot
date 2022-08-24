const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { Permissions } = require("discord.js");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("clan-add")
		.setDescription("Add a player to the clan")
        .addStringOption(option => 
            option.setName("player")
                .setDescription("Enter the IGN of the player to add to the clan")
                .setRequired(true))
        .addUserOption(option => 
            option.setName("mention")
                .setDescription("Mention the player to add to the clan")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("nb-accounts")
                .setDescription("Enter the number of accounts the player has")
                .setRequired(true))
        .addStringOption(option => 
            option.setName("clan-name")
                .setDescription("Enter the name of the clan")),

	async execute(...args) {

        const interaction = args[0];
        const client = args[1];

        // Stop if not mod
        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to modify clan.", ephemeral: true });
            return;
        }

        // Setting the player to update
        let playerNbAcc = interaction.options.getInteger("nb-accounts");
        if (!playerNbAcc) {
            nbAcc = 1;
        }

        const newPlayerIGN = interaction.options.getString("player");
        const newPlayer = {
            "IGN": newPlayerIGN,
            "userId": interaction.options.getUser("mention").id,
            "nbAcc": playerNbAcc
        };
        
        // Setting clan guildId
        const guildId = interaction.guildId;

        // Check clan
        let clan = await clanSchema.findOne({ "clanId": guildId  });
        const clanName = interaction.options.getString("clan-name");

        if (!clan && !clanName) {
            await interaction.reply({ content: "Clan does not exist! Please create add a clan name.", ephemeral: true });
            return;
        } else if (!clan) {
            await new clanSchema({
                "name": clanName,
                "players": [],
                "clanId": guildId,
                "nbAcc": 0
            }).save();

            clan = await clanSchema.findOne({ "clanId": guildId  });
        }

        const { name, nbAcc } = clan;

        // Updating
        if (nbAcc + playerNbAcc > 30) {
            await interaction.reply({ content: "Too many accounts in clan! Please remove some first.", ephemeral: true });
            return;
        } else {
            await clanSchema.updateOne({ "clanId": guildId }, { $inc: { "nbAcc": playerNbAcc }, $push: { "players": newPlayer }});
            await interaction.reply({ content: `Added ${newPlayerIGN} to ${name}.`});
            return;
        }
    },
}