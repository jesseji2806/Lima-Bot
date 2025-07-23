const { REST, Routes } = require("discord.js");
require("dotenv").config();
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_TOKEN;
const fs = require("node:fs");
const path = require("node:path");

// Check for production deployment argument
const isProduction = process.argv.includes("--prod") || process.argv.includes("--production");

const commands = [];
// Grab all the command files from the commands directory
const foldersPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(foldersPath, {
	recursive: true,
}).filter(file => file.endsWith(".js"));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
console.log(`Preparing to deploy ${commandFiles.length} commands...`);
for (const file of commandFiles) {
	const filePath = path.join(foldersPath, file);
	const command = require(filePath);
	if ("data" in command && "execute" in command) {
		commands.push(command.data.toJSON());
	}
	else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		let deploymentInfo;
		if (isProduction) {
			console.log("Deploying commands globally (production mode)...");
			deploymentInfo = await rest.put(
				Routes.applicationCommands(clientId),
				{ body: commands },
			);
		}
		else {
			console.log(`Deploying commands to guild ${guildId} (development mode)...`);
			if (!guildId) {
				throw new Error("GUILD_ID is required for development deployment. Set it in your .env file or use --prod for global deployment.");
			}
			deploymentInfo = await rest.put(
				Routes.applicationGuildCommands(clientId, guildId),
				{ body: commands },
			);
		}

		console.log(`Successfully reloaded ${deploymentInfo.length} application (/) commands.`);
		console.log(`Deployment mode: ${isProduction ? "Production (Global)" : "Development (Guild-specific)"}`);
	}
	catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();