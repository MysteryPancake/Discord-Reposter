"use strict";

console.log("LOADING LIBRARIES...");

const Discord = require("discord.js");
const client = new Discord.Client();

client.login("<SECRET_BOT_TOKEN>");

client.on("ready", function() {
	client.user.setActivity("on " + client.guilds.size + " servers").catch(console.log);
	console.log("READY FOR ACTION!");
});

async function reactLoop(iterator, sent, resolve) {
	const iter = iterator.next();
	if (iter.done) {
		resolve();
	} else {
		const emoji = iter.value.emoji;
		if (client.emojis.get(emoji.id)) {
			await sent.react(emoji).catch(console.log);
		}
		reactLoop(iterator, sent, resolve);
	}
}

function send(content, channel, reactions) {
	return new Promise(async function(resolve) {
		const sent = await channel.send(content).catch(console.log);
		reactLoop(reactions.values(), sent, resolve);
	});
}

async function embedLoop(index, message, channel, resolve) {
	const embed = message.embeds[index];
	if (embed) {
		if (embed.type === "rich") {
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
			await send(rich, channel, message.reactions);
		}
		embedLoop(index + 1, message, channel, resolve);
	} else {
		resolve({ message: message, author: message.author.id });
	}
}

async function fileLoop(iterator, message, channel, resolve) {
	const iter = iterator.next();
	if (iter.done) {
		resolve();
	} else {
		await send(iter.value.filesize > 8000000 ? iter.value.url : { files: [iter.value.url] }, channel, message.reactions);
		fileLoop(iterator, message, channel, resolve);
	}
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
	await new Promise(function(finished) {
		fileLoop(message.attachments.values(), message, channel, finished);
	});
	return new Promise(function(finished) {
		embedLoop(0, message, channel, finished);
	});
}

async function sendLoop(iterator, channel, resolve, lastAuthor, lastMessage) {
	const iter = iterator.next();
	if (iter.done) {
		resolve(lastMessage);
	} else {
		const last = await sendMessage(iter.value, channel, lastAuthor);
		sendLoop(iterator, channel, resolve, last.author, last.message);
	}
}

function sendMessages(messages, channel, lastAuthor) {
	return new Promise(function(resolve) {
		sendLoop(messages.values(), channel, resolve, lastAuthor);
	});
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

async function sendInfo(from, to) {
	await to.send(from.guild.iconURL).catch(console.log);
	await to.send("__**" + from.guild.name + "**__").catch(console.log);
	await to.send("**" + from.channel.name + "**").catch(console.log);
	await to.send("*" + (from.channel.topic || "No topic") + "*").catch(console.log);
	await to.send("__Pins__").catch(console.log);
	const pins = await from.channel.fetchPinnedMessages().catch(console.log);
	await sendMessages(pins, to);
	await to.send("__Messages__").catch(console.log);
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