"use strict";

console.log("LOADING LIBRARIES...");

const Discord = require("discord.js");
const client = new Discord.Client();

client.login("<SECRET_BOT_TOKEN>");

client.on("ready", function() {
	client.user.setActivity("on " + client.guilds.size + " servers").catch(console.log);
	console.log("READY FOR ACTION!");
});

let lastMessage, lastAuthor;

function reactLoop(values, sent, func) {
	const iter = values.next();
	if (iter.done) {
		func();
	} else {
		const emoji = iter.value.emoji;
		if (client.emojis.get(emoji.id)) {
			sent.react(emoji).then(function() {
				reactLoop(values, sent, func);
			}).catch(console.log);
		} else {
			reactLoop(values, sent, func);
		}
	}
}

function send(channel, content, reactions, func) {
	channel.send(content).then(function(sent) {
		reactLoop(reactions.values(), sent, func);
	}).catch(console.log);
}

function complete(iterator, message, channel, func) {
	lastMessage = message;
	lastAuthor = message.author.id;
	sendMessages(iterator, channel, func);
}

function embedLoop(embeds, index, iterator, message, channel, func) {
	const embed = embeds[index];
	if (embed) {
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
			rich.setFooter(embed.footer.text, embed.footer.icon);
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
		send(channel, rich, message.reactions, function() {
			embedLoop(embeds, index + 1, iterator, message, channel, func);
		});
	} else {
		complete(iterator, message, channel, func);
	}
}

function finalize(iterator, message, channel, func) {
	if (message.embeds.length) {
		embedLoop(message.embeds, 0, iterator, message, channel, func);
	} else {
		complete(iterator, message, channel, func);
	}
}

function fileLoop(values, iterator, message, channel, func) {
	const iter = values.next();
	if (iter.done) {
		finalize(iterator, message, channel, func);
	} else {
		send(channel, iter.value.filesize > 8000000 ? iter.value.url : { files: [iter.value.url] }, message.reactions, function() {
			fileLoop(values, iterator, message, channel, func);
		});
	}
}

function attachmentLoop(iterator, message, channel, func) {
	if (message.attachments.size) {
		fileLoop(message.attachments.values(), iterator, message, channel, func);
	} else {
		finalize(iterator, message, channel, func);
	}
}

function contentLoop(iterator, message, channel, func) {
	const content = message.content;
	if (content) {
		send(channel, content, message.reactions, function() {
			attachmentLoop(iterator, message, channel, func);
		});
	} else {
		attachmentLoop(iterator, message, channel, func);
	}
}

function sendMessages(iterator, channel, func) {
	const iter = iterator.next();
	if (iter.done) {
		func();
	} else {
		const message = iter.value;
		const author = message.author;
		if (author.id !== lastAuthor) {
			channel.send("**" + author.tag + "**").then(function() {
				contentLoop(iterator, message, channel, func);
			}).catch(console.log);
		} else {
			contentLoop(iterator, message, channel, func);
		}
	}
}

function fetchMessages(message, channel) {
	message.channel.fetchMessages({ limit: 100, before: message.id }).then(function(messages) {
		if (messages.size) {
			sendMessages(messages.values(), channel, function() {
				fetchMessages(lastMessage, channel);
			});
		}
	}).catch(console.log);
}

function sendInfo(from, to) {
	to.send(from.guild.iconURL).then(function() {
		to.send("__**" + from.guild.name + "**__");
	}).then(function() {
		to.send("**" + from.channel.name + "**");
	}).then(function() {
		to.send("*" + (from.channel.topic || "No topic") + "*");
	}).then(function() {
		to.send("__Pins__");
	}).then(function() {
		from.channel.fetchPinnedMessages().then(function(messages) {
			sendMessages(messages.values(), to, function() {
				to.send("__Messages__").then(function() {
					fetchMessages(from, to);
				}).catch(console.log);
			});
		}).catch(console.log);
	}).catch(console.log);
}

function repost(id, message, direction) {
	const channel = client.channels.get(id);
	if (channel) {
		message.channel.send("Reposting " + (direction ? "from" : "to") + " " + id + "!").then(function() {
			if (direction) {
				channel.fetchMessages({ limit: 1 }).then(function(messages) {
					sendInfo(messages.first(), message.channel);
				}).catch(console.log);
			} else {
				sendInfo(message, channel);
			}
		}).catch(console.log);
	} else {
		message.channel.send("Couldn't repost " + (direction ? "from" : "to") + " " + id + "!").catch(console.log);
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