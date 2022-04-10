const { SlashCommandBuilder } = require("@discordjs/builders");
const cbSchema = require("../schemas/cb-schema");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping-unhit")
		.setDescription("Ping players who haven't hit today yet"),

	async execute(...args) {

        const interaction = args[0];
        
        if (!interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
            return;
        }

        const { cbId, day } = await cbSchema.findOne({ IGN: "AquariumStatus" });

        if (day === 0 || day === 6) {
            await interaction.reply({ content: "CB not currently active!", ephemeral: true });
            return;
        }

        const results = await cbSchema.find({ cbId: cbId, day: day, IGN: { $nin: ["Aquarium", "AquariumStatus"] } });

        let toReply = `Players who haven't hit on day ${day} for CB${cbId}:\n`;
        for (const post of results) {
            const user = post.userId;
            if (user) {
                toReply += `<@${user}>, `;
            }
        }
        toReply += "you haven't hit today yet!"
        await interaction.reply(toReply);
    },
}
