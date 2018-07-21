"use strict";

console.log("LOADING LIBRARIES...");

const Discord = require("discord.js");
const client = new Discord.Client();

client.login("<SECRET_BOT_TOKEN>");

client.on("ready", function() {
	client.user.setActivity("on " + client.guilds.size + " servers").catch(console.error);
	console.log("READY FOR ACTION!");
});

async function send(content, channel, reactions) {
	const sent = await channel.send(content).catch(console.error);
	if (reactions.size) {
		for (const reaction of reactions.values()) {
			const emoji = reaction.emoji;
			if (client.emojis.has(emoji.id) || emoji.id === null) {
				await sent.react(emoji).catch(console.error);
			}
		}
	}
}

function richEmbed(embed) {
	const rich = new Discord.RichEmbed();
	if (embed.author) {
		rich.setAuthor(embed.author.name, embed.author.iconURL, embed.author.url);
	}
	rich.setColor(embed.color);
	if (embed.description) {
		rich.setDescription(embed.description);
	}
	for (let i = 0; i < embed.fields.length; i++) {
		const field = embed.fields[i];
		rich.addField(field.name, field.value, field.inline);
	}
	if (embed.footer) {
		rich.setFooter(embed.footer.text, embed.footer.iconURL);
	}
	if (embed.image) {
		rich.setImage(embed.image.url);
	}
	if (embed.thumbnail) {
		rich.setThumbnail(embed.thumbnail.url);
	}
	rich.setTimestamp(embed.timestamp);
	if (embed.title) {
		rich.setTitle(embed.title);
	}
	rich.setURL(embed.url);
	return rich;
}

const systemMessages = {
	DEFAULT: "",
	RECIPIENT_ADD: " added someone to the group.",
	RECIPIENT_REMOVE: " removed someone from the group.",
	CALL: " started a call.",
	CHANNEL_NAME_CHANGE: " changed the name of this channel.",
	CHANNEL_ICON_CHANGE: " changed the icon of this channel.",
	PINS_ADD: " pinned a message to this channel.",
	GUILD_MEMBER_JOIN: " just joined."
};

async function sendMessage(message, channel, lastAuthor) {
	const author = message.author;
	if (author.id !== lastAuthor || message.type !== "DEFAULT") {
		await channel.send("**" + author.tag + systemMessages[message.type] + "**").catch(console.error);
	}
	const content = message.content;
	if (content) {
		await send(content, channel, message.reactions);
	}
	if (message.attachments.size) {
		for (const attachment of message.attachments.values()) {
			await send(attachment.filesize > 8000000 ? attachment.url : { files: [attachment.url] }, channel, message.reactions);
		}
	}
	if (message.embeds.length) {
		for (let i = 0; i < message.embeds.length; i++) {
			const embed = message.embeds[i];
			if (embed.type === "rich") {
				await send(richEmbed(embed), channel, message.reactions);
			}
		}
	}
}

async function sendMessages(messages, channel, lastAuthor) {
	let last;
	if (messages.size) {
		const backward = messages.array().reverse();
		for (let i = 0; i < backward.length; i++) {
			await sendMessage(backward[i], channel, last ? last.author.id : lastAuthor);
			last = backward[i];
		}
	}
}

async function fetchMessages(message, channel, lastAuthor) {
	const messages = await message.channel.fetchMessages({ limit: 100, after: message.id }).catch(console.error);
	if (messages.size) {
		await sendMessages(messages, channel, lastAuthor);
		const last = messages.last();
		fetchMessages(last, channel, last.author.id);
	} else {
		channel.send("**Repost Complete!**").catch(console.error);
	}
}

function capitalizeFirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

async function sendInfo(from, to) {
	const rich = new Discord.RichEmbed();
	rich.setTitle(from.name);
	rich.setDescription(from.topic || "No topic");
	rich.setAuthor(from.guild.name, from.guild.iconURL);
	rich.setFooter("Reposting from " + from.id, client.user.displayAvatarURL);
	rich.setThumbnail(from.guild.iconURL);
	rich.setTimestamp();
	if (from.parent) {
		rich.addField("Channel Category", from.parent.name, true);
	}
	rich.addField("NSFW Channel", from.nsfw, true);
	rich.addField("Channel ID", from.id, true);
	rich.addField("Channel Type", from.type, true);
	rich.addField("Channel Creation Date", from.createdAt, true);
	rich.addField("Channel Creation Time", from.createdTimestamp, true);
	rich.addField("Server ID", from.guild.id, true);
	rich.addField("Server Owner", from.guild.owner.user.tag, true);
	rich.addField("Server Region", from.guild.region, true);
	const channels = {};
	for (const channel of from.guild.channels.values()) {
		channels[channel.type] = (channels[channel.type] || 0) + 1;
	}
	for (let channel in channels) {
		rich.addField(capitalizeFirst(channel) + " Channels", channels[channel], true);
	}
	let bots = 0;
	for (const member of from.guild.members.values()) {
		if (member.user.bot) {
			bots++;
		}
	}
	rich.addField("Server Humans", from.guild.members.size - bots, true);
	rich.addField("Server Bots", bots, true);
	rich.addField("Server Roles", from.guild.roles.size, true);
	rich.addField("Server Emojis", from.guild.emojis.size, true);
	rich.addField("Server Verification", from.guild.verificationLevel, true);
	rich.addField("Default Role", from.guild.defaultRole.name, true);
	rich.addField("Default Role ID", from.guild.defaultRole.id, true);
	if (from.guild.systemChannel) {
		rich.addField("Default Channel", from.guild.systemChannel.name, true);
		rich.addField("Default Channel ID", from.guild.systemChannelID, true);
	}
	rich.addField("Server Creation Date", from.guild.createdAt, true);
	rich.addField("Server Creation Time", from.guild.createdTimestamp, true);
	await to.send(rich).catch(console.error);
	await to.send("__**Pins**__").catch(console.error);
	const pins = await from.fetchPinnedMessages().catch(console.error);
	await sendMessages(pins, to);
	await to.send("__**Messages**__").catch(console.error);
	const messages = await from.fetchMessages({ limit: 1, after: "0" }).catch(console.error);
	const first = messages.first();
	if (first) {
		await sendMessage(first, to);
		fetchMessages(first, to, first.author.id);
	} else {
		to.send("**Repost Complete!**").catch(console.error);
	}
}

async function repost(id, message, direction) {
	const channel = client.channels.get(id);
	if (channel && (channel.type === "text" || channel.type === "group" || channel.type === "dm")) {
		await message.channel.send("**Reposting " + (direction ? "from" : "to") + " " + id + "!**").catch(console.error);
		sendInfo(direction ? channel : message.channel, direction ? message.channel : channel);
	} else {
		message.channel.send("**Couldn't repost " + (direction ? "from" : "to") + " " + id + "!** Try using `/repost channels`.").catch(console.error);
	}
}

function sendCommands(to) {
	const rich = new Discord.RichEmbed();
	rich.setTitle("Reposter Commands");
	rich.setDescription("By MysteryPancake");
	rich.setAuthor(client.user.username, client.user.displayAvatarURL);
	rich.setFooter(client.user.id, client.user.displayAvatarURL);
	rich.setThumbnail(client.user.displayAvatarURL);
	rich.setTimestamp();
	rich.setURL("https://github.com/MysteryPancake/Discord-Reposter#commands");
	rich.addField("Repost To", "*Reposts to a channel.*```/repost to <CHANNEL_ID>\n/repost <CHANNEL_ID>```", false);
	rich.addField("Repost From", "*Reposts from a channel.*```/repost from <CHANNEL_ID>```", false);
	rich.addField("Repost Channels", "*Posts the channels the bot is in.*```/repost channels```", false);
	rich.addField("Repost Commands", "*Posts a command list.*```/repost commands\n/repost help```", false);
	rich.addField("Channel ID", "```" + to.id + "```", false);
	to.send(rich).catch(console.error);
}

async function sendChannels(message) {
	await message.channel.send("**Sending " + client.channels.size + " channels to your direct messages!**").catch(console.error);
	const dm = await message.author.createDM().catch(console.error);
	await dm.send("__**Channel List**__").catch(console.error);
	for (const channel of client.channels.values()) {
		const rich = new Discord.RichEmbed();
		rich.setAuthor(channel.name, channel.guild.iconURL);
		rich.setFooter(capitalizeFirst(channel.type) + " Channel", client.user.displayAvatarURL);
		rich.setTimestamp();
		rich.addField("Channel ID", "`" + channel.id + "`", false);
		await dm.send(rich).catch(console.error);
	}
}

client.on("message", function(message) {
	if (message.author.bot) return;
	const args = message.content.split(" ");
	if (args[0] === "/repost") {
		if (args[1] === "help" || args[1] === "commands") {
			sendCommands(message.channel);
		} else if (args[1] === "channels") {
			sendChannels(message);
		} else {
			const last = args[2];
			if (last) {
				repost(last, message, args[1] === "from");
			} else {
				repost(args[1], message, false);
			}
		}
	}
});