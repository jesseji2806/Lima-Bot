const { SlashCommandBuilder } = require("@discordjs/builders");
const { clanSchema } = require("../schemas/cb-clan");
const { Permissions } = require("discord.js");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("clan-remove")
		.setDescription("Remove a player from the clan")
        .addStringOption(option => 
            option.setName("IGN")
                .setDescription("Enter the IGN of the player to remove from the clan"))
        .addUserOption(option => 
            option.setName("player-mention")
                .setDescription("Mention the player to remove from the clan")),

	async execute(...args) {

        const interaction = args[0];
        const client = args[1];

        // Stop if not mod
        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to modify clan.", ephemeral: true });
            return;
        }

        // Setting the player to update
        let playerToRemove = interaction.options.getUser("player-mention").id;
        if (!playerToRemove) {
            playerToRemove = interaction.options.getString("IGN");
            if (!playerToRemove) {
                await interaction.reply({ content: "You did not set a player!", ephemeral: true });
                return;
            }
        }

        // Setting clan guildId
        const { guildId } = interaction.guildId;

        // Updating
        const player = await clanSchema.findOne({ "clanId": guildId, "players": { $or: [{ $elemMatch: { "IGN": playerToRemove } }, { $elemMatch: { "userId": playerToRemove } }] } });

        const { nbAcc } = player;
        const nbAccToRemove = -nbAcc;
        if (!player) {
            await interaction.reply({ content: "Player is not in clan!", ephemeral: true });
            return;
        } else {
            await clanSchema.updateOne({ "clanId": guildId }, { $inc: { "nbAcc": nbAcc }, $pull: { "players": newPlayer }});
            await interaction.reply({ content: `Removed ${player} from clan.`});
            return;
        }
    },
}