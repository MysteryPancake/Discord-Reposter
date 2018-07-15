"use strict";

console.log("LOADING LIBRARIES...");

const Discord = require("discord.js");
const client = new Discord.Client();

client.login("<SECRET_BOT_TOKEN>");

client.on("ready", function() {
	client.user.setActivity("on " + client.guilds.size + " servers").catch(console.log);
	console.log("READY FOR ACTION!");
});

async function send(content, channel, reactions) {
	const sent = await channel.send(content).catch(console.log);
	if (reactions.size) {
		for (const reaction of reactions.values()) {
			const emoji = reaction.emoji;
			if (client.emojis.has(emoji.id) || emoji.id === null) {
				await sent.react(emoji).catch(console.log);
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

async function sendMessage(message, channel, lastAuthor) {
	const author = message.author;
	if (author.id !== lastAuthor) {
		await channel.send("**" + author.tag + "**").catch(console.log);
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
	return { message: message, author: message.author.id };
}

async function sendMessages(messages, channel, lastAuthor) {
	let last;
	if (messages.size) {
		for (const message of messages.values()) {
			last = await sendMessage(message, channel, last ? last.author : lastAuthor);
		}
	}
	return last && last.message;
}

async function fetchMessages(message, channel) {
	const last = await sendMessage(message, channel);
	const messages = await message.channel.fetchMessages({ limit: 100, before: message.id }).catch(console.log);
	if (messages.size) {
		const lastMessage = await sendMessages(messages, channel, last.author);
		fetchMessages(lastMessage, channel);
	} else {
		channel.send("**Repost Complete!**").catch(console.log);
	}
}

function capitalizeFirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

async function sendInfo(from, to) {
	const rich = new Discord.RichEmbed();
	rich.setAuthor(from.guild.name, from.guild.iconURL);
	rich.setDescription(from.channel.topic || "No topic");
	rich.setFooter("Reposting from " + from.channel.id, client.user.displayAvatarURL);
	rich.setThumbnail(from.guild.iconURL);
	rich.setTimestamp();
	rich.setTitle(from.channel.name);
	if (from.channel.parent) {
		rich.addField("Channel Category", from.channel.parent.name, true);
	}
	rich.addField("NSFW Channel", from.channel.nsfw, true);
	rich.addField("Channel ID", from.channel.id, true);
	rich.addField("Channel Type", from.channel.type, true);
	rich.addField("Channel Creation Date", from.channel.createdAt, true);
	rich.addField("Channel Creation Time", from.channel.createdTimestamp, true);
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
	await to.send(rich).catch(console.log);
	await to.send("__**Pins**__").catch(console.log);
	const pins = await from.channel.fetchPinnedMessages().catch(console.log);
	await sendMessages(pins, to);
	await to.send("__**Messages**__").catch(console.log);
	fetchMessages(from, to);
}

async function repost(id, message, direction) {
	const channel = client.channels.get(id);
	if (channel) {
		await message.channel.send("**Reposting " + (direction ? "from" : "to") + " " + id + "!**").catch(console.log);
		if (direction) {
			const messages = await channel.fetchMessages({ limit: 1 }).catch(console.log);
			sendInfo(messages.first(), message.channel);
		} else {
			sendInfo(message, channel);
		}
	} else {
		message.channel.send("**Couldn't repost " + (direction ? "from" : "to") + " " + id + "!**").catch(console.log);
	}
}

client.on("message", function(message) {
	if (message.author.bot) return;
	const args = message.content.split(" ");
	if (args[0] === "/repost") {
		const last = args[2];
		if (last) {
			repost(last, message, args[1] === "from");
		} else {
			repost(args[1], message, false);
		}
	}
});