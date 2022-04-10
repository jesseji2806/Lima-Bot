const { SlashCommandBuilder } = require("@discordjs/builders");
const cbSchema = require("../schemas/cb-schema");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("find-unhit")
		.setDescription("Find players who haven't hit today yet"),

	async execute(...args) {

        const interaction = args[0];
        
        const { cbId, day } = await cbSchema.findOne({ IGN: "AquariumStatus" });

        if (day === 0 || day === 6) {
            await interaction.reply({ content: "CB not currently active!", ephemeral: true });
            return;
        }

        const results = await cbSchema.find(
            { cbId: cbId , day: day, 
            IGN: { $nin: [ "Aquarium", "AquariumStatus" ] }, 
            $expr: { $lt: [ "$hitsDone", { $multiply: [ "$nbAcc", 3 ] } ] } });

        let toReply = `Players who haven't done all hits on day ${day} for CB${cbId}:\n`;
        for (const post of results) {
            const name = post.IGN;
            toReply += `${name}\n`;
        }
        await interaction.reply(toReply);
    },
}
