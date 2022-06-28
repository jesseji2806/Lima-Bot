const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const moment = require("moment");

module.exports = {
    AddRow: new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId("add-hit-1")
                .setLabel("Add 1 Hit")
                .setStyle("PRIMARY"),
            new MessageButton()
                .setCustomId("add-hit-2")
                .setLabel("Add 2 Hits")
                .setStyle("PRIMARY"),
            new MessageButton()
                .setCustomId("add-hit-all")
                .setLabel("Add All Hits")
                .setStyle("PRIMARY"),
        ),
    BossRow: new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId("boss-killed")
                .setLabel("Boss Killed")
                .setStyle("SUCCESS"),
        ),
    RemoveRow: new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId("remove-hit-1")
                .setLabel("Remove 1 Hit")
                .setStyle("DANGER"),
            new MessageButton()
                .setCustomId("remove-hit-2")
                .setLabel("Remove 2 Hits")
                .setStyle("DANGER"),
            new MessageButton()
                .setCustomId("remove-hit-all")
                .setLabel("Remove All Hits")
                .setStyle("DANGER"),
        ),
    LinkRow: (cbId) => {
        const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setLabel("Hit List")
                            .setStyle("LINK")
                            .setURL(`https://aquarium-hitlist.herokuapp.com/hitlist/${cbId}`),
                        new MessageButton()
                            .setLabel("Auto Teams")
                            .setStyle("LINK")
                            .setURL(`https://s3-us-west-2.amazonaws.com/holatuwol/priconne/cb${cbId}.html`));
        return row;
    },

    createEmbed: function (cbId, cbDay, ...args) {
        if (cbDay == 0) {
            const date = args[0];
            console.log(date);
            const embed = new MessageEmbed()
                        .setColor("#0099ff")
                        .setTitle(`CB ${cbId}`)
                        .setDescription(`CB planned for <t:${date}:F> <t:${date}:R>.`);
            return embed;
        } else if (cbDay <= 5) {
            const date = args[0];
            const lap = args[1];
            const boss = args[2];
            const bossIds = args[3];
            let tier = "";
            if (lap <= 3) {
                tier = "A";
            } else if (lap <= 10) {
                tier = "B";
            } else {
                tier = "C"
            };

            const embed = new MessageEmbed()
                            .setColor("#0099ff")
                            .setTitle(`CB ${cbId}, Boss ${tier}${boss}`)
                            .setDescription(`Hit registration for day ${cbDay} of CB${cbId}.\n
                                            Day ends at <t:${date}:F> <t:${date}:R>.\n
                                            Currently on Lap ${lap}, Boss ${boss}.\n
                                            Attacking ${tier}${boss}.`)
                            .setThumbnail("https://pricalc.b-cdn.net/jp/unit/extract/latest/icon_unit_" + bossIds[boss-1] + ".png");
            return embed;
        } else {
            const embed = new MessageEmbed()
                            .setColor("#0099ff")
                            .setTitle(`CB ${cbId}`)
                            .setDescription("CB has ended.");
            return embed;
        }  
    }, 
}