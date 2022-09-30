const { SlashCommandBuilder } = require("@discordjs/builders");
const cbSchema = require("../schemas/cb-schema");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("waitlist")
		.setDescription("Retrieve the waitlist"),

	async execute(...args) {

        const interaction = args[0];
        
        const { cbId, day } = await cbSchema.findOne({ IGN: "AquariumStatus" });

        if (day === 0 || day === 6) {
            await interaction.reply({ content: "CB not currently active!", ephemeral: true });
            return;
        }

        let toReply = `Waitlist for day ${day} of CB${cbId}:\n`;

        for (let i = 1; i <= 5; ++i) {
            const players = await cbSchema.find({ "cbId": cbId, "day": day, "IGN": { $ne: "AquariumStatus" }, "bossIds": i }, { "_id": 0, "IGN": 1 }, { sort: { "_id": 1 } });
            if (players.length > 0) {
                toReply += `**Boss ${i}:**\n`;
                for (const player of players) {
                    toReply += `${player.IGN}\n`;
                }
            }
        }

        await interaction.reply(toReply);
    },
}
