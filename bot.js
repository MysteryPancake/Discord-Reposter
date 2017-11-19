"use strict";

console.log("LOADING LIBRARIES...");

const Discord = require("discord.js");
const client = new Discord.Client();

client.login("<SECRET_BOT_TOKEN>");

client.on("ready", function() {
	client.user.setGame("on " + client.guilds.size + " servers");
	console.log("READY FOR ACTION!");
});

let lastMessage, lastAuthor;

function fetchMessages(message, channel) {
	message.channel.fetchMessages({ limit: 100, before: message.id }).then(function(messages) {
		messages.forEach(function(value) {
			const author = value.author;
			if (author.id !== lastAuthor) {
				channel.send("**" + author.tag + "**");
			}
			const content = value.content;
			if (content) {
				channel.send(content);
			}
			value.attachments.forEach(function(file) {
				channel.send(file.url);
			});
			lastMessage = value;
			lastAuthor = author.id;
		});
		fetchMessages(lastMessage, channel);
	}).catch(console.log);
}

client.on("message", function(message) {
	if (message.author.bot) return;
	if (message.content.startsWith("/repost")) {
		const id = message.content.substr(8);
		const channel = client.channels.get(id);
		if (channel) {
			message.channel.send("Reposting to " + id + "!");
			channel.send(message.guild.iconURL);
			channel.send("__**" + message.guild.name + "**__");
			channel.send("**" + message.channel.name + "**");
			channel.send("*" + message.channel.topic + "*");
			fetchMessages(message, channel);
		} else {
			message.channel.send("Couldn't repost to " + id + "!");
		}
	}
});
