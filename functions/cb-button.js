const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const moment = require("moment");

module.exports = {
    row: new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId("add-hit")
                .setLabel("Add Hit")
                .setStyle("PRIMARY"),
        ),
    
    createEmbed: function (cbId, cbDay, ...args) {
        if (cbDay == 0) {
            const date = args[0];
            const embed = new MessageEmbed()
                        .setColor("#0099ff")
                        .setTitle(`CB ${cbId}`)
                        .setDescription(`CB Planned for <t:${date}:F> in <t:${date}:R>.`);
            return embed;
        } else if (cbDay <= 5) {
            const embed = new MessageEmbed()
                            .setColor("#0099ff")
                            .setTitle(`CB ${cbId}`)
                            .setDescription(`Hit registration for day ${cbDay} of CB.`);
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