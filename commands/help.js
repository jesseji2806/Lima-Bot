const { SlashCommandBuilder } = require("@discordjs/builders");

const embed = {
    "type": "rich",
    "title": `Lima Bot Commands`,
    "description": "",
    "color": 0x00FFFF,
    "fields": [
        {
            "name": `/help:`,
            "value": `get list of commands.`
        },
        {
            "name": `/add-hit`,
            "value": `adds a hit to hit list.`,
            "inline": true
        },
        {
            "name": `Player`,
            "value": ` IGN or Mention`,
            "inline": true
        },
        {
            "name": `Day`,
            "value": `1 to 5`,
            "inline": true
        },
        {
            "name": `/remove-hit`,
            "value": `removes a hit from the hit list.`,
            "inline": true
        },
        {
            "name": `Player`,
            "value": ` IGN or Mention`,
            "inline": true
        },
        {
            "name": `Day`,
            "value": `1 to 5`,
            "inline": true
        },
        {
            "name": `/get-hit`,
            "value": `gets all hit for a CB.`,
            "inline": true
        },
        {
            "name": `Player:`,
            "value": `IGN or Mention`,
            "inline": true
        },
        {
            "name": `CB ID`,
            "value": `Number`,
            "inline": true
        },
        {
            "name": `/find-unhit`,
            "value": `gets IGNs of all players who haven't done all their hits today.`
        },
        {
            "name": `/ping-unhit`,
            "value": `pings all players who haven't done all their hits today.`
        },
        {
            "name": `/start-cb`,
            "value": `starts a CB instance.`,
            "inline": false
        },
        {
            "name": `CB ID`,
            "value": `Number`,
            "inline": true
        },
        {
            "name": `Destination`,
            "value": `Channel`,
            "inline": true
        },
        {
            "name": `Start Date`,
            "value": `DD-MM-YYYY`,
            "inline": true
        }
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get a list of commands"),

    async execute(...args) {

        const interaction = args[0];
        await interaction.channel.send({ embeds: [embed] });
    },
}