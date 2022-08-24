const { SlashCommandBuilder } = require("@discordjs/builders");
const cbSchema = require("../schemas/cb-schema");
const { Permissions } = require("discord.js");
const { idToIGN, IGNToId, hitsToPrint, cbRemoveHit, isPlayer } = require("../database/database");


module.exports = {
	data: new SlashCommandBuilder()
		.setName("remove-hit")
		.setDescription("Remove a hit from the CB Hit List")
        .addStringOption(option => 
            option.setName("player")
                .setDescription("Enter the player to remove hit from"))
        .addUserOption(option => 
            option.setName("player-mention")
                .setDescription("Enter the player to remove hits from using a mention"))
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
                .setDescription("Enter the number of hits to remove")),

	async execute(...args) {

        const interaction = args[0];
        const client = args[1];
        const clanId = interaction.guildId;

        // Setting the player to update
        let playerHit = interaction.options.getString("player");
        const playerHitMention = interaction.options.getUser("player-mention");
        if (playerHitMention) {
            playerHit = playerHitMention.id;
        }

        if (!playerHit) {
            console.log("Setting command user as player to update.");
            playerHit = idToIGN(interaction.user.id, clanId);
        }

        // Convert to IGN if id
        if (idToIGN(playerHit, clanId)) {
            playerHit = idToIGN(playerHit, clanId)
        }
        
        // Stop if the player is not valid
        if (!isPlayer(playerHit, clanId)) {
            console.log("Player is not valid.");
            await interaction.reply({ content: "You have entered an invalid player name.", ephemeral: true});
            return;
        }

        // Stop if trying to update someone else when not allowed
        if ((IGNToId(playerHit, clanId) !== interaction.user.id) && !interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
            await interaction.reply({ content: "You do not have permission to remove others' hits.", ephemeral: true });
            return;
        }

        // Default to one hit if no hits specified
        let hitsToRemove = interaction.options.getInteger("hits");
        if (!hitsToRemove) {
            console.log("Setting hits to add to 1");
            hitsToRemove = 1;
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

                cbRemoveHit(hitCbId, hitDay, playerHit, hitsToRemove, async function(retval) {
                    if (Number.isInteger(retval)) {
                        const printHits = hitsToPrint(hitsToRemove);
                        const printRet = hitsToPrint(retval);
                        await interaction.reply({ content: `Removed ${printHits} from ${playerHit} on day ${hitDay}.\nPlayer has ${printRet} on day ${hitDay}.` });
                        
                        // logging
                        await client.channels.cache.get(data.logs).send({ "content": `(CB${hitCbId}) ${interaction.user.tag} removed ${printHits} from ${playerHit} on day ${hitDay}. Total: ${printRet}` });
                        return;
                    } else if (retval === "No hits to remove") {
                        await interaction.reply({ content: `Player has no hits on day ${hitDay}.`});
                        return;
                    } else if (retval === "Too many hits") {
                        await interaction.reply({ content: "You are trying to remove too many hits at once.", ephemeral: true });
                        return;
                    } else {
                        await interaction.reply({ content: "An error has occured while removing hit."});
                        return;
                    }
                });
                return;
            }
        });
	},
};