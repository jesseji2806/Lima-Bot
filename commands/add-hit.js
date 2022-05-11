const { SlashCommandBuilder } = require("@discordjs/builders");
const cbSchema = require("../schemas/cb-schema");
const { Permissions } = require("discord.js");
const { isPlayer, idToIGN, IGNToId, hitsToPrint, cbAddHit } = require("../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("add-hit")
		.setDescription("Add a hit to the CB Hit List")
        .addStringOption(option => 
            option.setName("player")
                .setDescription("Enter the player to add hit to"))
        .addUserOption(option => 
            option.setName("player-mention")
                .setDescription("Enter the player to add hit to using a mention"))
        .addIntegerOption(option =>
            option.setName("day")
                .setDescription("Enter the day of the hit")
                .addChoice("1", 1)
                .addChoice("2", 2)
                .addChoice("3", 3)
                .addChoice("4", 4)
                .addChoice("5", 5))
        .addIntegerOption(option =>
            option.setName("hits")
                .setDescription("Enter the number of hits to add")),

	async execute(...args) {

        const interaction = args[0];
        const client = args[1];

        // Setting the player to update
        let playerHit = interaction.options.getString("player");
        const playerHitMention = interaction.options.getUser("player-mention");
        if (playerHitMention) {
            playerHit = playerHitMention.id;
        }

        if (!playerHit) {
            console.log("Setting command user as player to update.");
            playerHit = idToIGN(interaction.user.id);
        }

        // Convert to IGN if id
        if (idToIGN(playerHit)) {
            playerHit = idToIGN(playerHit)
        }
        
        // Stop if the player is not valid
        if (!isPlayer(playerHit)) {
            console.log("Player is not valid.");
            await interaction.reply({ content: "You have entered an invalid player name.", ephemeral: true});
            return;
        }

        // Stop if trying to update someone else when not allowed
        if ((IGNToId(playerHit) !== interaction.user.id) && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to add others' hits.", ephemeral: true });
            return;
        }

        // Default to one hit if no hits specified
        let hitsToAdd = interaction.options.getInteger("hits");
        if (!hitsToAdd) {
            console.log("Setting hits to add to 1");
            hitsToAdd = 1;
        }

        // Updating
        cbSchema.findOne({ IGN: "AquariumStatus" }, async function (err, data) {
            if (err) {
                console.log("Error obtaining current CB status.");
            } else {
                const hitCbId = data.cbId;
                let hitDay = interaction.options.getInteger("day");
                if (!hitDay) {
                    hitDay = data.day;
                }
                if (hitDay === 0 || hitDay === 6) {
                    await interaction.reply({ content: "CB hasn't started yet!", ephemeral: true });
                    return;
                }

                cbAddHit(hitCbId, hitDay, playerHit, hitsToAdd, async function(retval) {
                    if (Number.isInteger(retval)) {
                        const printHits = hitsToPrint(hitsToAdd);
                        const printRet = hitsToPrint(retval);
                        await interaction.reply({ content: `Added ${printHits} to ${playerHit} on day ${hitDay}.\nPlayer has ${printRet} on day ${hitDay}.`});
                        
                        // logging
                        await client.channels.cache.get(data.logs).send({ "content": `(CB${hitCbId}) ${interaction.user.tag} added ${printHits} to ${playerHit} on day ${hitDay}. Total: ${printRet}` });
                        return;
                    } else if (retval === "All hits done") {
                        await interaction.reply({ content: `Player has already hit all hits for day ${hitDay}.`});
                        return;
                    } else if (retval === "Too many hits") {
                        await interaction.reply({ content: "You are trying to add too many hits at once.", ephemeral: true });
                        return;
                    } else {
                        await interaction.reply({ content: "An error has occured while adding hit."});
                        return;
                    }
                });
                return;
            }
        });
	},
};